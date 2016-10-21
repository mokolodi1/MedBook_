docker run -d --name "cbio" \
    --restart=always \
    --net=medbook_default \
    -p 8080:8080 \
    -v /home/ubuntu/elementlab/custom_config:/custom_config/ \
    -v /home/ubuntu/elementlab/custom_config:/cbioportal/ \
    -v /logs/folder_path/:/cbio_logs/ \
    -v /studies/path:/cbio_studies/ \
    elementolab/cbioportal:1.1.1
