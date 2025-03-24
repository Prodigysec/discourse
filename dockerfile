# Use the official Discourse base image
FROM discourse/base:latest

# Install dependencies
RUN apt-get update && apt-get install -y \
    redis-server \
    postgresql \
    postgresql-contrib \
    imagemagick

# Start PostgreSQL and create the database
RUN service postgresql start && \
    sudo -u postgres createuser -s discourse && \
    sudo -u postgres createdb discourse -O discourse

# Set Discourse directory
WORKDIR /var/www/discourse

# Clone the Discourse repository
RUN git clone https://github.com/discourse/discourse.git .

# Install gems and dependencies
RUN bundle install --deployment --without test development

# Precompile assets (optional for speed)
RUN RAILS_ENV=production bundle exec rake assets:precompile

# Expose the default Discourse port
EXPOSE 3000

# Start services and Discourse
CMD service postgresql start && redis-server & \
    bundle exec rails server -b 0.0.0.0 -p 3000 -e production
