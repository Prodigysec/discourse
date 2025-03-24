# Use Ubuntu 18.04 as required for Discourse
FROM ubuntu:18.04

# Set non-interactive mode for automated installation
ENV DEBIAN_FRONTEND=noninteractive

# Update system and install dependencies
RUN apt-get update && apt-get install -y \
    wget curl git sudo \
    build-essential libssl-dev libreadline-dev zlib1g-dev \
    libsqlite3-dev sqlite3 \
    postgresql postgresql-contrib \
    redis-server \
    imagemagick \
    nodejs npm \
    && apt-get clean

# Enable memory overcommit for Redis
RUN echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf && \
    sysctl -w vm.overcommit_memory=1

# Install Rails and Ruby
RUN bash <(wget -qO- https://raw.githubusercontent.com/discourse/install-rails/master/linux)

# Clone Discourse
RUN git clone https://github.com/discourse/discourse.git /home/discourse

# Set working directory
WORKDIR /home/discourse

# Set up PostgreSQL role
RUN service postgresql start && \
    sudo -u postgres createuser -s root

# Install required gems
RUN source ~/.bashrc && bundle install

# Setup and migrate database
RUN bundle exec rake db:create && \
    bundle exec rake db:migrate && \
    RAILS_ENV=test bundle exec rake db:create db:migrate

# Start Redis, PostgreSQL, and Discourse on container start
CMD sysctl -w vm.overcommit_memory=1 && \
    service postgresql start && \
    redis-server --daemonize yes && \
    bundle exec rails server -b 0.0.0.0
