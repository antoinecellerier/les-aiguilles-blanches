#!/usr/bin/sh

./publish.sh
scp -r dist/* cellerie@ftp.cluster110.hosting.ovh.net:www/les-aiguilles-blanches/
