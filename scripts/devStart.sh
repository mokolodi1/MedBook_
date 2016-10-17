export COMPOSE_HTTP_TIMEOUT=360

set_up_env="/home/ubuntu/set_up_environment.sh"
if test -f $set_up_env; then
    source $set_up_env
else
    export MONGO_URL="mongodb://127.0.0.1:27017/MedBook"
fi

docker-compose -f ./docker/docker-compose.yml -f ./docker/docker-compose-dev.yml -f ./docker/docker-compose-mongo.yml up
