if [[ -e /custom_config/ ]]; then
        echo "deploying custom configuration"
	/bin/cp --force /custom_config/portal.properties /cbioportal/src/main/resources/;
        #begin added by MedBook
        /bin/cp --force /custom_config/portal.properties $CATALINA_HOME/webapps/cbioportal/WEB_INF/classes/portal.properties
        /bin/cp --force /custom_config/log4j.properties $CATALINA_HOME/webapps/cbioportal/WEB_INF/classes/log4j.properties
        #end added by MedBook
	/bin/cp --force /custom_config/log4j.properties /cbioportal/src/main/resources/;
	source /root/.bash_profile; /bin/cp --force /custom_config/context.xml $CATALINA_HOME/conf/context.xml;
fi
