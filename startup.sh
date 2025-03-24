#!/bin/bash

# Start Redis server
redis-server --daemonize yes

# Set up PostgreSQL connection
export DATABASE_URL=postgresql://postgres:password@db-host:5432/discourse

# Run database migrations
export SKIP_MULTISITE=1
export SKIP_TEST_DATABASE=1
bin/rake db:create db:migrate

# Start Discourse
export DISCOURSE_DEV_ALLOW_ANON_TO_IMPERSONATE=1
bin/ember-cli -u
