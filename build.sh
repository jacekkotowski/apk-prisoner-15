#!/bin/bash
# Builds Prisoner15.apk without Gradle. Needs ANDROID_SDK_ROOT (default /opt/android-sdk) and signing.env with KS_FILE and KS_PASS.
set -e
cd "$(dirname "$0")"
S=${ANDROID_SDK_ROOT:-/opt/android-sdk}
[ -f signing.env ] || { echo "signing.env is missing, see README.md"; exit 1; }
. ./signing.env
BT=$S/build-tools/36.0.0; J=$S/platforms/android-36/android.jar; O=out; rm -rf $O; mkdir -p $O/classes $O/res $O/gen
$BT/aapt2 compile --dir app/res -o $O/res/res.zip
$BT/aapt2 link -o $O/base.apk -I $J --manifest app/AndroidManifest.xml --min-sdk-version 29 --target-sdk-version 36 --java $O/gen -A app/assets $O/res/res.zip
javac -nowarn --release 11 -classpath $J -d $O/classes app/src/pl/prisoner15/*.java $(find $O/gen -name '*.java')
$BT/d8 --release --lib $J --min-api 29 --output $O $(find $O/classes -name '*.class')
cp $O/base.apk $O/u.apk; (cd $O && zip -q u.apk classes.dex)
$BT/zipalign -f -p 4 $O/u.apk $O/a.apk
$BT/apksigner sign --ks "$KS_FILE" --ks-pass "pass:$KS_PASS" --out Prisoner15.apk $O/a.apk
$BT/apksigner verify --print-certs Prisoner15.apk | head -2
ls -la Prisoner15.apk; sha256sum Prisoner15.apk
