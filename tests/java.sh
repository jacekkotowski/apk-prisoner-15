#!/bin/bash
# Runs the cadence tests: the walking and running call, in plain Java, without a phone.
set -eo pipefail
cd "$(dirname "$0")/.."
O=$(mktemp -d)
javac -nowarn -d "$O" app/src/pl/prisoner15/Cadence.java tests/CadenceTest.java 2>&1 | grep -v "^Picked up" || true
java -cp "$O" pl.prisoner15.CadenceTest 2>&1 | grep -v "^Picked up"
rm -rf "$O"
