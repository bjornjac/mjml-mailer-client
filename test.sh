#!/bin/bash

set -a
source ./.env
set +a

mjml-mailer-cli \
	template \
	--token=${TOKEN} \
	--api=${API} \
	--domain=${DOMAIN} \
	--name='register_confirm' \
	< templates/register_confirm.njk

mjml-mailer-cli \
	send \
	--token=${TOKEN} \
	--api=${API} \
	--domain=${DOMAIN} \
	--name="register_confirm" \
	--rcpt=${EMAIL} \
	--vars='{"name": "Long John Silver", "firstname": "Long", "username": "silver"}'
