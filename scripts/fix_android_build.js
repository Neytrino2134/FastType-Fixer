
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const androidDir = path.join(rootDir, 'android');

console.log('🔥 STARTING TOTAL REWRITE OF ANDROID CONFIGURATION (Latest Stable)...');
console.log('Target: AGP 8.5.2 | Gradle 8.9 | SDK 34');

// 1. Delete existing android folder
if (fs.existsSync(androidDir)) {
    console.log('🗑️  Deleting old android folder...');
    try {
        fs.rmSync(androidDir, { recursive: true, force: true });
    } catch (e) {
        console.error('❌ Could not delete android folder. Please close Android Studio and try again.');
        process.exit(1);
    }
}

// 2. Re-add Android platform
console.log('📦 Re-creating Android project (npx cap add android)...');
try {
    execSync('npx cap add android', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
    console.error('❌ Failed to add android platform. Ensure node_modules are installed.');
    process.exit(1);
}

// 3. Sync Web Assets
console.log('🔄 Syncing web assets...');
try {
    execSync('npx cap sync', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
    console.error('❌ Failed to sync.');
    process.exit(1);
}

// 4. Inject Permissions into AndroidManifest.xml
console.log('🛡️  Injecting Permissions...');
const manifestPath = path.join(androidDir, 'app/src/main/AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
    let manifestContent = fs.readFileSync(manifestPath, 'utf8');
    
    const permissions = `
    <!-- Permissions injected by Fix Script -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    `;

    if (!manifestContent.includes('android.permission.RECORD_AUDIO')) {
        manifestContent = manifestContent.replace('<application', `${permissions}\n    <application`);
        fs.writeFileSync(manifestPath, manifestContent);
        console.log('✅ Permissions injected.');
    }
}

// 5. FORCE OVERWRITE CONFIGURATION FILES
console.log('🔧 Overwriting build configurations for Java 21 compatibility...');

// --- A. variables.gradle ---
const variablesPath = path.join(androidDir, 'variables.gradle');
const variablesContent = `
ext {
    minSdkVersion = 24
    compileSdkVersion = 34
    targetSdkVersion = 34
    androidxActivityVersion = '1.8.0'
    androidxAppCompatVersion = '1.6.1'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.12.0'
    androidxFragmentVersion = '1.6.2'
    androidxWebkitVersion = '1.9.0'
    coreSplashScreenVersion = '1.0.1'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.1.5'
    androidxEspressoCoreVersion = '3.5.1'
    cordovaAndroidVersion = '10.1.1'
}
`;
fs.writeFileSync(variablesPath, variablesContent);
console.log('✅ variables.gradle overwritten.');

// --- B. build.gradle (Project Level) ---
const buildGradlePath = path.join(androidDir, 'build.gradle');
const buildGradleContent = `
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        // UPDATED: AGP 8.5.2 (Very stable, supports Java 21)
        classpath 'com.android.tools.build:gradle:8.5.2'
        classpath 'com.google.gms:google-services:4.4.1'
    }
}

apply from: "variables.gradle"

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`;
fs.writeFileSync(buildGradlePath, buildGradleContent);
console.log('✅ android/build.gradle overwritten (AGP 8.5.2).');

// --- C. gradle-wrapper.properties ---
const wrapperPath = path.join(androidDir, 'gradle/wrapper/gradle-wrapper.properties');
const wrapperContent = `
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
# UPDATED: Gradle 8.9 (Latest stable for this AGP, supports Java 21)
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-all.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;
fs.writeFileSync(wrapperPath, wrapperContent);
console.log('✅ gradle-wrapper.properties overwritten (Gradle 8.9).');

// --- D. gradle.properties (New file for stability) ---
const propsPath = path.join(androidDir, 'gradle.properties');
const propsContent = `
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
`;
fs.writeFileSync(propsPath, propsContent);
console.log('✅ gradle.properties created.');

console.log('\n🚀 DONE! Full Clean Reconstruction Complete (Latest Stable).');
console.log('👉 Open Android Studio. Wait for Gradle Sync.');
