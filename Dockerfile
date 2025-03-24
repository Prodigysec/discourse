# Use the official Bitnami Discourse base image
FROM bitnami/discourse:latest

# Set working directory
WORKDIR /opt/bitnami

# Remove existing Discourse directory completely
RUN rm -rf /opt/bitnami/discourse && mkdir -p /opt/bitnami/discourse

# Clone your modified Discourse version
RUN git clone https://github.com/Prodigysec/discourse.git /opt/bitnami/discourse

# Set working directory inside Discourse
WORKDIR /opt/bitnami/discourse

# Ensure the Gemfile exists
RUN ls -l /opt/bitnami/discourse/Gemfile || echo "Gemfile not found!"

# Install required system dependencies
RUN apt-get update && apt-get install -y redis-server postgresql-client imagemagick

# Fix permissions for Bundler directory
# RUN chown -R discourse:discourse /opt/bitnami/discourse/.bundle || chown -R root:root /opt/bitnami/discourse/.bundle
RUN mkdir -p /opt/bitnami/discourse/.bundle && chown -R discourse:discourse /opt/bitnami/discourse/.bundle


# Install Ruby gems (without setting BUNDLE_USER_CONFIG)
RUN mkdir -p /tmp/vendor/bundle && \
    bundle config set --global path '/tmp/vendor/bundle' && \
    bundle config set --global deployment 'true' && \
    bundle config set --global without 'test development' && \
    bundle install

# Symlink the bundle directory so Discourse can find it
RUN ln -s /tmp/vendor/bundle /opt/bitnami/discourse/vendor/bundle

# Precompile assets
RUN RAILS_ENV=production bundle exec rake assets:precompile

# Expose default Discourse port
EXPOSE 3000

# Start Discourse (Bitnami’s start script)
CMD ["/opt/bitnami/scripts/discourse/run.sh"]
