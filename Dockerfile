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
# RUN chown -R daemon:daemon /opt/bitnami/discourse

# Switch to daemon user (Bitnami default)
# USER daemon

# Switch to root user
USER root

# Set working directory to ensure Gemfile is found
WORKDIR /opt/bitnami/discourse

# Ensure the directory exists before installing gems
RUN mkdir -p /tmp/vendor/bundle && \
    bundle config set path '/tmp/vendor/bundle' && \
    bundle config set deployment 'true' && \
    bundle config set without 'test development' && \
    bundle install

# Symlink the bundle directory so Discourse can find it
RUN ln -s /tmp/vendor/bundle /opt/bitnami/discourse/vendor/bundle

# Switch back to bitnami user
USER bitnami

# Install Ruby gems
RUN bundle config set --local deployment 'true' && \
    bundle config set --local without 'test development' && \
    bundle install --path vendor/bundle

# Precompile assets
RUN RAILS_ENV=production bundle exec rake assets:precompile

# Expose default Discourse port
EXPOSE 3000

# Start Discourse (Bitnami’s start script)
CMD ["/opt/bitnami/scripts/discourse/run.sh"]
