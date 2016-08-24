curl -k --proxy localhost:8888 -c c https://oncore.ucsf.edu/login/login > /dev/null
curl -k --proxy localhost:8888 -b c -c c -d "username=$USERNAME" -d "password=$PASSWORD" https://oncore.ucsf.edu/login/login > /dev/null
curl -k --proxy localhost:8888 -b c -c c https://oncore.ucsf.edu/login/redirecthome > /dev/null
curl -k --proxy localhost:8888 -b c -c c https://oncore.ucsf.edu/smrs/SMRSLogonServlet?hdn_function=WELCOME > /dev/null
curl -k --proxy localhost:8888 -b c -c c -d $FORMOPTIONS https://oncore.ucsf.edu/smrs/BioStatConsoleControlServlet > $OUTPUT
curl -k --proxy localhost:8888 -b c -c c https://oncore.ucsf.edu/login/logout   > /dev/null

