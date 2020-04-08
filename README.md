# Kona Engine

Engine is a rest micro-service application server for cloud-native applications. Here is what it does:

- fronts web service handles, requests
- Makes sure requests adhere to the swagger spec
- Manges oauth and security
- manages database access
- manages memory database access
- manages load balancing, startup and shutdown
- manages email delivery
- manages logging and distributed logging
- provides error management
- provides basic application monitoring
- provides basic application instrumentation


## For the impatient

The "Hello World" service

Prerequisites: npm install -g gulp typescript

1. git clone git@github.com:frogfishio/engine.git
2. cd engine
3. npm install --no-bin-links
4. gulp compile
5. npm run builtin-demo
6. curl http://localhost:8888/v1/hello

The result should be a JSON response.

To do the same in a manner that can be replicated to multitude of services:

1. Copy everything in hello/builtin folder into a separate folder (preferably a repository). This will form the basis for your new micro service
2. Go into your new micro service folder and run "npm init" . This will initialise your micro service project
4. Run: npm install @frogfish/kona --no-bin-links
5. Finally, just like the above run your service as: DEBUG='engine\*' node node_modules/@frogfish/kona/engine -c demo/hello/builtin/hello-service.yaml --root \$PWD
6. curl http://localhost:8888/v1/hello

This shuld give you the same result and voila, you've got your micro service running

## Installation

npm install --no-bin-links @frogfish/kona

## Scheduler

The configured jobs are mostly there for starting up the initial jobs and jumpstarting
the initialization of the services. Managing jobs through config is dangerous as one
gets into all sorts of potential race conditions

Configuration should NOT be used to manage job versions, even though was what it was
designed for.

## Configuration

Environment variables for running in containers

### Runtime
- SERVICE_PREFIX - the prefix path before the service e.g. /some/place/to/go this is added
  in front of /v1/service_name and useful for hosting in containers

### System
- ENGINE_SYSTEM_ID - Identifier of the service (mandatory)
- ENGINE_SYSTEM_LISTEN - Interface address e.g. 0.0.0.0
- ENGINE_SYSTEM_PORT - System port number
- ENGINE_SYSTEM_ROOT - Where is application installed
- ENGINE_SYSTEM_ENV - Environment name for logging purposes
- ENGINE_SYSTEM_TENANT - Tennant name for logging purposes
- ENGINE_SYSTEM_APP - Application ID for logging purposes
- ENGINE_SYSTEM_TAG - Tag name for logging purposes
- ENGINE_SYSTEM_LIVE - boolean, tells system it is a production-grade application
- ENGINE_SYSTEM_DEBUG - forces debug mode

### Memory
- ENGINE_MEMORY_HOSTS - Memmory host e.g. 12.12.12.12:12345 OR 12.12.12.12:12345,22.22.22.22:12345
- ENGINE_MEMORY_SEGMENT - Memory data segment
- ENGINE_MEMORY_NAME - Name of memory cluster
- ENGINE_MEMORY_PASSWORD - Password of memory cluster

### File storage
- ENGINE_FILE_{file type}_{file property}

- ENGINE_FILE_CONTEXT - context for storing files e.g. 'myfiles'
- ENGINE_FILE_STORE_TYPE - local | s3
- ENGINE_FILE_STORE - folder/bucket for storing files e.g. 'my-files'
- ENGINE_FILE_S3_KEY - S3 key
- ENGINE_FILE_S3_SECRET - S3 Secret key

Database
- ENGINE_DB_NAME - name of database
- ENGINE_DB_HOSTS - database hosts e.g. 12.12.12.12:12345 OR 12.12.12.12:12345,22.22.22.22:12345
- ENGINE_DB_REPLICA_SET - replica set name
- ENGINE_DB_USER - database username
- ENGINE_DB_PASSWORD - database password

### HTTP Connector

HTTP connector is used to communicate with back-end resources.

It supports 3 types of configuration values:

1. Plain strring e.g. passphrase: "passphrase"
2. Environment variable e.g. passphrase: $passphrase. This will retrieve passphrase from environment variable "passphrase"
3. Decoded environment variable e.g. passphrase: "#passphrase" this will work the same way as 1 but in addition it will perforrm Base64 decode. This is useful for encoded binary data
4. File references e.g. passphrase = @/tmp/passphrase. This will load the passphrase from file /tmp/passphrase

Keep in mind not all configuration elements support all types of configuration values.

Example configuration
```
connectors:
  test-connector:
    type: http
    url: https://duckduckgo.com
    pfx: "#PFX"
    passphrase: $PASSPHRASE
    mime: application/json
    headers:
      Content-Type: application/json
    data:
      hello: world
    proxy:
      host: $proxy_host
      port: $proxy_port
      auth: $proxy_auth
    cache:
      ttl: time-in-seconds
```

## TO DO

- Change all timestamps to UTC using time library
