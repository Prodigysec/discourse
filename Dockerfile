# Use the official Bitnami Discourse base image
FROM bitnami/discourse:latest

# Set working directory
WORKDIR /opt/bitnami

# Set Bundler path to a writable directory
ENV BUNDLE_USER_CONFIG=/opt/bitnami/discourse/.bundle

# Remove existing Discourse directory completely
RUN rm -rf /opt/bitnami/discourse && mkdir -p /opt/bitnami/discourse

# Clone your modified Discourse version
RUN git clone https://github.com/Prodigysec/discourse.git /opt/bitnami/discourse

# Install required system dependencies
RUN apt-get update && apt-get install -y redis-server postgresql-client imagemagick

# Remove rbenv-related lines (Bitnami already provides Ruby)
# Ensure the correct Ruby version (check `ruby -v` after build)
RUN ruby -v

# Set correct ownership for Discourse files
RUN chown -R daemon:daemon /opt/bitnami/discourse

# Switch to daemon user (Bitnami default)
USER daemon

# Install Ruby gems
RUN chmod -R 777 /opt/bitnami && \
    rm -rf /opt/bitnami/discourse/.bundle && \
    mkdir -p /opt/bitnami/discourse && \
    bundle config set --local deployment 'true' && \
    bundle config set --local without 'test development' && \
    bundle install --path vendor/bundle

# Precompile assets
RUN RAILS_ENV=production bundle exec rake assets:precompile

# Expose default Discourse port
EXPOSE 3000

# Start Discourse (Bitnami’s start script)
CMD ["/opt/bitnami/scripts/discourse/run.sh"]
