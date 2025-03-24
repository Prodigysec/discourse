# Use the official Bitnami Discourse base image
FROM bitnami/discourse:latest

# Set working directory
WORKDIR /opt/bitnami/discourse

# Remove existing files to avoid conflicts
RUN rm -rf /opt/bitnami/discourse/*

# Clone your modified Discourse version
RUN git clone https://github.com/Prodigysec/discourse.git /opt/bitnami/discourse

# Install required system dependencies
RUN apt-get update && apt-get install -y redis-server postgresql-client imagemagick

# Remove rbenv-related lines (Bitnami already provides Ruby)
# Ensure the correct Ruby version (check `ruby -v` after build)
RUN ruby -v

# Set proper ownership for Discourse files
RUN chown -R bitnami:bitnami /opt/bitnami/discourse

# Switch to bitnami user (used by Bitnami Discourse image)
USER bitnami

# Install Ruby gems
RUN bundle config set deployment 'true' && bundle config set without 'test development' && bundle install

# Precompile assets
RUN RAILS_ENV=production bundle exec rake assets:precompile

# Expose default Discourse port
EXPOSE 3000

# Start Discourse (Bitnami’s start script)
CMD ["/opt/bitnami/scripts/discourse/run.sh"]
