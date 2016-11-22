export COMPOSE_HTTP_TIMEOUT=360

set_up_env="/home/ubuntu/set_up_environment.sh"
if test -f $set_up_env; then
    source $set_up_env
else
    export MONGO_URL="mongodb://mongo:27017/MedBook"
fi

export PATIENT_CARE_SETTINGS=$(cat ./patient-care/webapp/settings.json)
export JOB_RUNNER_SETTINGS=$(cat ./job-runner/webapp/settings.json)

docker-compose -f docker-compose.yml up $1
