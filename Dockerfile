# Use the official Discourse base image
FROM bitnami/discourse:latest

# Set working directory
WORKDIR /var/www/discourse

# Clone your modified Discourse version
RUN git clone https://github.com/Prodigysec/discourse.git .

# Install required system dependencies
RUN apt-get update && apt-get install -y redis-server postgresql-client imagemagick

# Ensure correct Ruby version
RUN rbenv install 3.3.0 && rbenv global 3.3.0

# Create a discourse user
RUN useradd -m discourse && chown -R discourse:discourse /var/www/discourse

# Switch to discourse user
USER discourse

# Install Ruby gems
RUN bundle config set deployment 'true' && bundle config set without 'test development' && bundle install

# Precompile assets
RUN RAILS_ENV=production bundle exec rake assets:precompile

# Switch back to root to copy startup script
USER root
COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

# Expose default Discourse port
EXPOSE 3000

# Start Discourse
CMD ["/startup.sh"]

