# Use the official Discourse base image
FROM bitnami/discourse:latest

# Install dependencies
RUN apt-get update && apt-get install -y \
    redis-server \
    postgresql-client \
    imagemagick

# Set working directory
WORKDIR /var/www/discourse

# Clone the Discourse repository
RUN git clone https://github.com/Prodigysec/discourse.git .

# Install gems and dependencies
RUN bundle install --deployment --without test development

# Precompile assets for faster performance
RUN RAILS_ENV=production bundle exec rake assets:precompile

# Copy the startup script
COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

# Expose the default Discourse port
EXPOSE 3000

# Start Discourse
CMD ["/startup.sh"]
