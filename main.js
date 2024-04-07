import * as THREE from "three";
import Ammo from "ammojs3";
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GUI } from "dat.gui";
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@latest/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@3.0.0';
import {readShaderFile, onReadShader, bumpMaterial} from "./shader.js";
import {initPhysicsUniverse,updatePhysicsUniverse,convertToPhysics} from "./ammo.js";
import { animateArmsPenguin, animateLegs, animateLegsPenguin, animateSleigh, walkPhase } from "./animation/animation.js";

// AMMO JS VARIABLE
const ammo = await new Ammo();
export var tmpTransformation = undefined; // temporarily stores transformation

// Snowflake variables
let particles; // snow flake
let positions = [], velocities = []; // snow flake position (x,y,z) and flake velocity (x,y,z)

const numberSnowFlakes = 500; // number of snowFlakes

const maxRange = 400, minRange = maxRange/2; // flakes are places from -200 to 200 on x and z axis
const minHeight = -50; // flakes are places from -50 to 50 on y axis

let snowFlakeCounter = 0; //in order to render snowflakes once
const snowFlakeGeo = new THREE.BufferGeometry(); // stores our snow flake geomerty

// initalize environment mapping variable
let envmap;

// initialize scene
let scene;
// initialize clock
let clock;
// initialize renderer
let renderer;
// initialize camera
let camera;

// initialize animals
let pesto1;
let pesto2;
let pesto3;
let pesto4;
let pesto5;
let pesto6;
let pesto7;
let pesto8;
let pesto9;
let pesto10;
let rudolph;

// fly through
const points = [
    new THREE.Vector3(-20, 5, 10),
    new THREE.Vector3(-5, 10, 5),
    new THREE.Vector3(-5, 15, 0),
    new THREE.Vector3(-5, 15, -5),
    new THREE.Vector3(20, 15, 10)
];
const curve = new THREE.CatmullRomCurve3(points);

let speed = 0;

const flyThroughControls = {
    playFlyThrough: false,
    restartFlyThrough: function() {
        speed = 0;
        playFlyThrough = true;
    }
};

const reindeerPOVControls = {
    enablePOV : false,
};

// constant for height of mountains
const MAX_HEIGHT = 10;
const SNOW_HEIGHT = MAX_HEIGHT * 0.8;
const snowSTONE_HEIGHT = MAX_HEIGHT * 0.7;
const SNOW2_HEIGHT = MAX_HEIGHT * 0.5;
const ICE_HEIGHT = MAX_HEIGHT * 0.3;
const mossSNOW_HEIGHT = MAX_HEIGHT * 0.0;

// Person Variables
let loadedModel;
const gltfLoader = new GLTFLoader();
gltfLoader.load("assets/person/scene.gltf", (gltfScene) => {
    loadedModel = gltfScene;
    gltfScene.scene.rotation.x = - Math.PI / 8;
    gltfScene.scene.position.y = 10;
    gltfScene.scene.scale.set(12,12,12);
    scene.add(gltfScene.scene);

});

// Speech Bubble Variables
let loadedModelTwo;
const gltfLoaderTwo = new GLTFLoader();
gltfLoaderTwo.load("assets/speech_bubble_02/scene.gltf", (gltfScene) => {
    loadedModelTwo = gltfScene;
    gltfScene.scene.position.x = -5;
    gltfScene.scene.position.y = 18;
    gltfScene.scene.scale.set(0.01,0.01,0.01);
    scene.add(gltfScene.scene);

});

function initGraphicsUniverse() {
    // create the scene and set a background color
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#d6d1ff");

     // create the camera and set its position
    camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(0,30,80);

    // create a clock
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    // make values computed by render properly display on monitor
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    // enabling shadows in the renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    var ambientLight = new THREE.AmbientLight(0xcccccc, 1);
    scene.add(ambientLight);

    // adding a point light
    const light = new THREE.PointLight( new THREE.Color("#fffeed").convertSRGBToLinear().convertSRGBToLinear(),200,300); // convert color of the light so renderer understands
    light.position.set(10,20,10);

    // adding a point light towards perlin and bump mapping balls
    const lightBalls = new THREE.PointLight( new THREE.Color("#fffeed").convertSRGBToLinear().convertSRGBToLinear(),200,300); // convert color of the light so renderer understands
    lightBalls.position.set(35,10,0);
   

    // make sure the light can cast shadows
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;

    // add the light to our scene
    scene.add(light);
    scene.add(lightBalls);

    // set orbit controls to always look at origin
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0,0,0);
    controls.dampingFactor = 0.05;
    controls.enableDamping = true;
}



// entry point
function main(){
    // Read shader from file
  readShaderFile('shader/bump.vs', 'v');
  readShaderFile('shader/bump.fs', 'f');
}


export function AmmoStart(vs_source,fs_source)
{   
    tmpTransformation = new ammo.btTransform();

    initPhysicsUniverse();
    initGraphicsUniverse();

    //process the environment map to use in our materials
    let pmremGenerator = new THREE.PMREMGenerator(renderer);

    // make sure envmap loaded before texturing objects
    new RGBELoader()
        .setDataType(THREE.FloatType)
        .load("assets/snowy_hillside_4k.hdr", function (texture) {
            envmap = pmremGenerator.fromEquirectangular(texture).texture;
            pmremGenerator.dispose();
        // Ensure the environment map is set or updated here, e.g., for your materials or scene background
    

        let textures = {
            snow2: new THREE.TextureLoader().load("assets/snow2.jpg"),
            snow: new THREE.TextureLoader().load("assets/snow.jpg"),
            mossSnow: new THREE.TextureLoader().load("assets/mossSnow.jpg"),
            ice: new THREE.TextureLoader().load("assets/ice.jpg"),
            SnowStone: new THREE.TextureLoader().load("assets/snowStone.jpg"),
            container: new THREE.TextureLoader().load("assets/houseFloor.jpg"),
            wood: new THREE.TextureLoader().load("assets/wood.jpg"),
            glass: new THREE.TextureLoader().load("assets/glass.jpg"),
            snowFlake: new THREE.TextureLoader().load("images/snowflake-emoji.png")
        };
        
        const simplex = new SimplexNoise(); // optional seed as a string parameter

        // creating map of hexagons
        for(let i=-10; i<=10; i++){
            for(let j=-10; j<=10; j++){
                
                let position = titleToPosition(i,j);

                // if the radius of heaxgon outside of circle radius of size 16, we skip it
                if(position.length()>16) continue;

                // +1 * 0.5 is a normalization factor we add to keep the noise between [0,1]
                let noise = (simplex.noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
                // makes mountains a little steeper
                noise = Math.pow(noise, 1.5);

                makeHex(noise * MAX_HEIGHT, position, envmap);
            }
        }

        // create a new hexagon geomtry with added environment material mapping depending on each type of hexagon
        
        let stoneMesh = hexMesh(stoneGeo,textures.SnowStone);
        let iceMesh = hexMesh(iceGeo,textures.ice);
        let snowMesh = hexMesh(snowGeo,textures.snow);
        let snow2Mesh = hexMesh(snow2Geo,textures.snow2);
        let snowMossMesh = hexMesh(mossGeo,textures.mossSnow);

        // create a snowy transperent mesh encapuslating all bottom hexagons
        let snowFloorMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(17, 17, MAX_HEIGHT * 0.13, 50),
            new THREE.MeshPhysicalMaterial({
            envMap: envmap,
            color: new THREE.Color("#f5fcfb").convertSRGBToLinear().multiplyScalar(3),
            ior: 1.3,
            transmission: 1,
            transparent: true,
            thickness: 0.5,
            envMapIntensity: 0.2, 
            roughness: 1,
            metalness: 0.025,
            roughnessMap: textures.snow,
            metalnessMap: textures.snow,
            })
        );
        snowFloorMesh.receiveShadow = true;
        snowFloorMesh.rotation.y = -Math.PI * 0.333 * 0.5;
        snowFloorMesh.position.set(0, MAX_HEIGHT * 0.0, 0);

        convertToPhysics(snowFloorMesh,new THREE.Vector3(0,0,0),0,null,false,17,MAX_HEIGHT * 0.13);        

        //add another cylinder for walls around our other meshes
        let mapContainer =new  THREE.Mesh(
            new  THREE.CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
            new  THREE.MeshPhysicalMaterial({
                envMap: envmap,
                map: textures.container,
                envMapIntensity: 0.2, 
                side: THREE.DoubleSide, // render both sides
            })
          );
        mapContainer.receiveShadow = true;
        mapContainer.rotation.y = -Math.PI * 0.333 * 0.5;
        mapContainer.position.set(0, MAX_HEIGHT * 0.0, 0);

        convertToPhysics(mapContainer,new THREE.Vector3(0,0,0),0,null,false,17.1,MAX_HEIGHT * 0.0); 

        //add another cylinder for walls around our other meshes
        let snowBallContainer =new  THREE.Mesh(
            new  THREE.CylinderGeometry(8, 8, MAX_HEIGHT * 1.5, 50, true),
            new  THREE.MeshPhysicalMaterial({
                envMap: envmap,
                map: textures.snow,
                envMapIntensity: 0.2, 
                side: THREE.DoubleSide, // render both sides
            })
        );
        snowBallContainer.receiveShadow = true;
        snowBallContainer.rotation.y = -Math.PI * 0.333 * 0.5;
        snowBallContainer.position.set(50, MAX_HEIGHT * 0, 0);

        convertToPhysics(snowBallContainer,new THREE.Vector3(50,0,0),0,null,false,8,MAX_HEIGHT * 1.5); 

        // add a cylinder for the floor around the entire mesh
        let mapFloor = new THREE.Mesh(
            new  THREE.CylinderGeometry(21, 18.5, MAX_HEIGHT * 0.1, 50),
            new  THREE.MeshPhysicalMaterial({
                envMap: envmap,
                map: textures.wood,
                envMapIntensity: 0.1, 
                side:  THREE.DoubleSide,
            })
          );
        mapFloor.receiveShadow = true;
        mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);

        convertToPhysics(mapFloor,new THREE.Vector3(0,-MAX_HEIGHT * 0.05,0),0,null,false,21,MAX_HEIGHT * 0.1); 
        
        // and random clouds
        clouds();

        // penguins and reindeer
        pesto1 = penguin();
        pesto1.position.set(-10, 1.2, - 4 * 20 + 23); 
        pesto2 = penguin();
        pesto2.position.set(-25, 1.2, - 2 * 20 +23); 
        pesto3 = penguin();
        pesto3.position.set(40, 1.2, Math.random() * 20 +23); 
        pesto4 = penguin();
        pesto4.position.set(50, 1.2, - 3 * 20 +23); 
        pesto5 = penguin();
        pesto5.position.set(1, 1.2, Math.random() * 20 +23); 
        pesto6 = penguin();
        pesto6.position.set(-6, 1.2, Math.random() * 20 +23); 
        pesto7 = penguin();
        pesto7.position.set(-45, 1.2, - 4 * 20 +23); 
        pesto8 = penguin();
        pesto8.position.set(7, 1.2, Math.random() * 20 +23); 
        pesto9 = penguin();
        pesto9.position.set(-70, 1.2, Math.random() * 20 +23); 
        pesto10 = penguin();
        pesto10.position.set(1, 1.2, Math.random() * 20 +23); 
        rudolph = reindeer();
        console.log(rudolph);
        window.addEventListener('keydown', handleKeyDown);
        //reindeerGenerate();

        addSnowflakes(textures);

         // create a snowy transperent mesh encapuslating all bottom hexagons
        let Globe = new THREE.Mesh(
            new THREE.SphereGeometry(21, 50, 50,0,Math.PI * 2,0,1.57),
            new THREE.MeshPhysicalMaterial({
                metalness: 0,
                roughness: 0,
                transmission: 1,
                ior: 1.7,
                clearcoat: 1.0,
                thickness: 0.5,
                transparent: true,
                opacity: 0.2
            })
        );
        Globe.receiveShadow = true;
        convertToPhysics(Globe,new THREE.Vector3(0,0,0),0,null,true,21,0); 

        let material = new THREE.ShaderMaterial( {
            uniforms: { 
              time: { // float initialized to 0
                  type: "f", 
                  value: 0.0 
              },
              colors: { // float initialized to 0
                type: "f", 
                value: new THREE.Vector3(1,1,1)
            }
          },
          vertexShader: document.getElementById( 'vertexShader' ).textContent,
          fragmentShader: document.getElementById( 'fragmentShader' ).textContent
      } );

        // perlin texture and displkcement on a sphere
        let perlinBall = new THREE.Mesh(
            new THREE.SphereGeometry(1, 50,50),
            material
        );
        perlinBall.position.set(2,30,0);
        convertToPhysics(perlinBall,new THREE.Vector3(2,30,0),1,null,true,1,0); 

        // procedural bump mapping on a sphere
        var geometry = new THREE.SphereGeometry( 1, 32, 32 );
       
        var bm = bumpMaterial(vs_source,fs_source);
        var bumpMapBall = new THREE.Mesh( geometry, bm );
        bumpMapBall.position.set(2,100,0);
        convertToPhysics(bumpMapBall,new THREE.Vector3(2,100,0),1,null,true,1,0); 
       

        // add a cylinder for the floor around the entire mesh
        let outerFloorMesh = new THREE.Mesh(
            new  THREE.CylinderGeometry(90, 100, MAX_HEIGHT * 0.1, 50),
            new  THREE.MeshPhysicalMaterial({
                envMap: envmap,
                map: textures.snow,
                envMapIntensity: 0.5, 
                side:  THREE.DoubleSide,
            })
          );
        outerFloorMesh.receiveShadow = true;
        outerFloorMesh.position.set(0, -0.6, 0);

        convertToPhysics(outerFloorMesh,new THREE.Vector3(0,-0.6,0),0,null,false,100,MAX_HEIGHT * 0.1); 

        // dat.gui controls
        var controls = new function () {
            this.speed = -10;
            this.surf_color = [ Math.trunc(255*bm.uniforms.SurfColor.value.r),
            Math.trunc(255*bm.uniforms.SurfColor.value.g),
			Math.trunc(255*bm.uniforms.SurfColor.value.b)]
            this.bumpDensity = bm.uniforms.BumpDensity.value;
            this.bumpSize = bm.uniforms.BumpSize.value;
            this.specularFactor = bm.uniforms.SpecularFactor.value;
            this.red = 1,
            this.green = 1,
            this.blue = 1,
            this.update = function () {
                perlinBall.material.uniforms.color = new THREE.Vector3(controls.red,controls.green,controls.blue);
                
                if(controls.surf_color) {
                    bm.uniforms.SurfColor.value.r = controls.surf_color[0]/255.0;
                    bm.uniforms.SurfColor.value.g = controls.surf_color[1]/255.0;
                    bm.uniforms.SurfColor.value.b = controls.surf_color[2]/255.0;
                  }
                // Add changing other uniforms
                bm.uniforms.BumpDensity.value = controls.bumpDensity;
                bm.uniforms.BumpSize.value = controls.bumpSize;
                bm.uniforms.SpecularFactor.value = controls.specularFactor;

                let deltaTime = clock.getDelta();
                updatePhysicsUniverse( deltaTime );
                renderer.render( scene, camera );
                
            };
            };

        var gui = new GUI();
        let perlinFolder = gui.addFolder('Perlin ball Controls');
        perlinFolder.add(controls, 'red', 0, 1).onChange(controls.update);
        perlinFolder.add(controls, 'green', 0, 1).onChange(controls.update);
        perlinFolder.add(controls, 'blue', 0, 1).onChange(controls.update);
        perlinFolder.close();
        let bumpMapFolder = gui.addFolder('Bump map ball controls');
        bumpMapFolder.add(controls, 'speed', -15, -1).onChange(controls.redraw);
        bumpMapFolder.addColor(controls, 'surf_color').onChange(controls.update);
        bumpMapFolder.add(controls, 'bumpDensity', 1, 50.0).onChange(controls.update);
        bumpMapFolder.add(controls, 'bumpSize', 0.0, 0.5).onChange(controls.update);
        bumpMapFolder.add(controls, 'specularFactor', 0.0, 1.0).onChange(controls.update);
        let flyThroughFolder = gui.addFolder('Fly-through the globe!');
        flyThroughFolder.add(flyThroughControls, 'playFlyThrough').name('Play/Pause').listen();
        flyThroughFolder.add(flyThroughControls, 'restartFlyThrough').name('Restart');
        gui.add(reindeerPOVControls, 'enablePOV').name('Rudolph POV').onChange(function(value){
            rudolphToggle(value);
        });

        scene.add(Globe);
        scene.add(mapFloor);
        scene.add(mapContainer);
        scene.add(snowBallContainer);
        scene.add(snowFloorMesh);
        scene.add(outerFloorMesh);
        scene.add(stoneMesh,iceMesh,snowMesh,snow2Mesh,snowMossMesh);
        scene.add(perlinBall);
        scene.add(bumpMapBall);
        
        
        render();

    });
    
    
}

// start program
main()

function render()
{
        let deltaTime = clock.getDelta();
        updatePhysicsUniverse( deltaTime );

        updateSnowFlakes();
        //controls.update();
        if (rudolph) animateLegs(rudolph);
        if (rudolph) animateSleigh(rudolph);

        if (pesto1) animateArmsPenguin(pesto1, clock.getElapsedTime());
        if (pesto1) animateLegsPenguin(pesto1, clock.getElapsedTime());
        flyThrough();

        // rudolph POV
        if (reindeerPOVControls.enablePOV) {
            const nose = rudolph.getObjectByName("nose");
            if (nose) {
                const reindeerNosePosition = new THREE.Vector3();
                nose.getWorldPosition(reindeerNosePosition);
                camera.position.copy(reindeerNosePosition);
                camera.quaternion.copy(rudolph.quaternion);

                // rotate 90 degrees so rudolph faces the right way when moving
                camera.rotateY(Math.PI / 2);
            }
        }


        renderer.render( scene, camera );
        requestAnimationFrame( render );
}

// change i,j values to vector coordinates in order to adjust hexagon offset
function titleToPosition(X,Y){
    return new THREE.Vector2((X +(Y%2)*0.5)*1.77,Y*1.535);
}


// place holder hex to use 
let mossGeo = new THREE.BoxGeometry(0,0,0);
let snowGeo = new THREE.BoxGeometry(0,0,0);
let snow2Geo = new THREE.BoxGeometry(0,0,0);
let stoneGeo = new THREE.BoxGeometry(0,0,0);
let iceGeo = new THREE.BoxGeometry(0,0,0);


function hexGeo(height,position){
    let geo  = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);
    
    return geo;
}

// merge geometries together to reduce the amount of draw calls
function makeHex(height,position){
    let geo  = hexGeo(height,position);

    // adding the hexagons depending on which type of texture 
    if (height > SNOW_HEIGHT){
        snowGeo =  mergeGeometries([geo,snowGeo])

        if(Math.random() > 0.5){
            snowGeo = mergeGeometries([snowGeo,tree(height,position)])
        }

    } else if(height > snowSTONE_HEIGHT){
        stoneGeo = mergeGeometries([geo,stoneGeo])

        if(Math.random() > 0.8){
            stoneGeo = mergeGeometries([stoneGeo,stone(height,position)])
        }

    } else if(height > SNOW2_HEIGHT){
        snow2Geo =  mergeGeometries([geo,snow2Geo])

        if(Math.random() > 0.5){
            snow2Geo = mergeGeometries([snow2Geo,tree(height,position)])
        }

    }  else if(height > ICE_HEIGHT){
        iceGeo =  mergeGeometries([geo,iceGeo])
    }  else if(height > mossSNOW_HEIGHT){
        mossGeo =  mergeGeometries([geo,mossGeo])

        if(Math.random() > 0.8){
            mossGeo = mergeGeometries([mossGeo,stone(height,position)])
        }
    }
}

// function to create the hexagon mesh with enviromental mapping
function hexMesh(geo,map){
    let mat = new THREE.MeshPhysicalMaterial({
        envMap: envmap,
        envMapIntensity: 0.3,
        flatShading: true,
        map
    });

    let mesh = new THREE.Mesh(geo,mat)
    // making sure our mesh can cast shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

// create stones of different sizes
function stone (height,position){
    // random position for variation of positions of rocks
    const px = Math.random() * 0.4;
    const pz = Math.random() * 0.4;

    const geo = new THREE.SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
    geo.translate(position.x + px, height, position.y + pz)

    return geo;
}

// create pyramid like trees of different siZes
function tree(height, position) {
    const treeHeight = Math.random() * 1 + 1.25;
  
    const geo = new THREE.CylinderGeometry(0, 1.5, treeHeight, 3);
    geo.translate(position.x, height + treeHeight * 0 + 1, position.y);
    
    const geo2 = new THREE.CylinderGeometry(0, 1.15, treeHeight, 3);
    geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);
    
    const geo3 = new THREE.CylinderGeometry(0, 0.8, treeHeight, 3);
    geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);
  
    return mergeGeometries([geo, geo2, geo3]);
  }

// function to randomly generate clouds
function clouds() {
    let geo = new THREE.SphereGeometry(0, 0, 0); 
    let count = Math.floor(Math.pow(Math.random(), 0.45) * 4);

    for(let i = 0; i < count; i++) {
        const puff1 = new THREE.SphereGeometry(1.2, 7, 7);
        const puff2 = new THREE.SphereGeometry(1.5, 7, 7);
        const puff3 = new THREE.SphereGeometry(0.9, 7, 7);
        
        puff1.translate(-1.85, Math.random() * 0.4, 0);
        puff2.translate(0,     Math.random() * 0.4, 0);
        puff3.translate(1.85,  Math.random() * 0.4, 0);

        const cloudGeo = mergeGeometries([puff1, puff2, puff3]);
        cloudGeo.translate( 
        Math.random() * 20 - 10, 
        Math.random() * 7 + 7, 
        Math.random() * 20 - 10
        );
        cloudGeo.rotateY(Math.random() * Math.PI * 2);

        geo = mergeGeometries([geo, cloudGeo]);
    }

    const MESH = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
        envMap: envmap, 
        envMapIntensity: 0.75, 
        flatShading: true,
        })
    );

    scene.add(MESH);
}

function updateSnowFlakes(){
    // each snow flake has positions (x,y,z) that we itterate over and adjust
    for (let i=0; i< numberSnowFlakes*3; i+=3){
        // add veloctiy to position of each snow flake
        particles.geometry.attributes.position.array[i] -=  particles.geometry.attributes.velocity.array[i]; // change x position by x velocity
        particles.geometry.attributes.position.array[i+1] -=  particles.geometry.attributes.velocity.array[i+1]; // change y position by y velocity
        particles.geometry.attributes.position.array[i+2] -=  particles.geometry.attributes.velocity.array[i+2]; // change z position by z velocity

        //checks to see if flake is below grade and resets its position
        if(particles.geometry.attributes.position.array[i+1] < 0){
            particles.geometry.attributes.position.array[i] = Math.floor(Math.random()*maxRange - minRange);
            particles.geometry.attributes.position.array[i+1] = Math.floor(Math.random()* minRange + minHeight);
            particles.geometry.attributes.position.array[i+2] = Math.floor(Math.random()*maxRange - minRange);
        }
    }
    // set below to true in order to update position array of particles
    particles.geometry.attributes.position.needsUpdate = true;
}

function addSnowflakes(textures){

    // create the snow flake geometry
    for(let i=0;i<numberSnowFlakes;i++){
        positions.push(
            Math.floor(Math.random() *maxRange - minRange), // x between max range and min range
            Math.floor(Math.random() *maxRange + minHeight), // y between min range and min height
            Math.floor(Math.random() *maxRange - minRange), // y between max range and min range
        );
        velocities.push(
            Math.floor(Math.random()*6 - 3) * 0.1, 
            Math.floor(Math.random()*5 + 0.12) * 0.18, 
            Math.floor(Math.random()*6 - 3) * 0.1, 
        )
    }

    // set attributes of position and velocity in its geometry
    snowFlakeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    snowFlakeGeo.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities,3));

    // create material for snowflake
    const snowFlakeMaterial = new THREE.PointsMaterial({
        size: 4,
        map: textures.snowFlake,
        blending: THREE.AdditiveBlending,
        depthTest: false, // we dont need to know if objects snowflakes overlap
        transparent: true,
        opacity: 0.7
    });

    particles = new THREE.Points(snowFlakeGeo,snowFlakeMaterial);
    scene.add(particles);
}

// make penguin
function penguin() {
    const penguin = new THREE.Group();

    // body
    const points = [];
    for (let i = 0; i < 10; i++) {
    points.push(new THREE.Vector2(Math.sin(i * 0.2) * 0.7 + 0.1, (i - 5) * 0.2));
    }
    const bodyGeometry = new THREE.LatheGeometry(points);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI;
    body.name = "body";
    penguin.add(body);

    // stomach
    const stomachGeometry = new THREE.SphereGeometry(1,32,32);
    const scaleX = 0.7; 
    const scaleY = 1;   
    const scaleZ = 0.5;
    stomachGeometry.scale(scaleX, scaleY, scaleZ);
    const stomachMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const stomach = new THREE.Mesh(stomachGeometry, stomachMaterial);
    stomach.name = "stomach";
    penguin.add(stomach);


    // head
    const headGeometry = new THREE.DodecahedronGeometry(0.45, 1);
    const headMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.3, 0);
    head.name = "head";

    // face
    const faceGeometry = new THREE.DodecahedronGeometry(0.22, 32); 
    const faceMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.set(0.3, 0, 0);
    face.rotation.y = Math.PI / 2;
    head.add(face); 
    penguin.add(head);

    // eyes
    const eyeOneGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeOneMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const eyeOne = new THREE.Mesh(eyeOneGeometry, eyeOneMaterial);
    eyeOne.position.set(0.3, 1.4, 0.2);
    eyeOne.name = "eyeOne";
    penguin.add(eyeOne);
    const eyeTwoGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeTwoMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const eyeTwo = new THREE.Mesh(eyeTwoGeometry, eyeTwoMaterial);
    eyeTwo.position.set(0.3, 1.4, -0.2);
    eyeTwo.name = "eyeTwo";
    penguin.add(eyeTwo);

    // pupils
    const eyeLeftGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeLeftMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const eyeLeft = new THREE.Mesh(eyeLeftGeometry, eyeLeftMaterial);
    eyeLeft.position.set(0.5, 1.45, 0.2);
    eyeLeft.name = "eyeLeft";
    penguin.add(eyeLeft);
    const eyeRightGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeRightMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const eyeRight = new THREE.Mesh(eyeRightGeometry, eyeRightMaterial);
    eyeRight.position.set(0.5, 1.45, -0.2);
    eyeRight.name = "eyeRight";
    penguin.add(eyeRight);

    // beak
    const beakGeometry = new THREE.ConeGeometry(0.07, 0.17, 8);
    const beakMaterial = new THREE.MeshBasicMaterial({ color: "orange" });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0.5, 1.3, 0);
    beak.rotation.x = Math.PI;
    beak.name = "beak";
    penguin.add(beak);

    // wings
    const leftWingGeometry = new THREE.ConeGeometry(0.3, 1.2, 8);
    const leftWingMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const leftWing = new THREE.Mesh(leftWingGeometry, leftWingMaterial);
    leftWing.position.set(0, 0.1, 0.65); 
    leftWing.rotation.z = - Math.PI / 2; 
    leftWing.rotation.x = - 4; 
    leftWing.name = "leftEar";
    penguin.add(leftWing);
    const rightWingGeometry = new THREE.ConeGeometry(0.3, 1.2, 8);
    const rightWingMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const rightWing = new THREE.Mesh(rightWingGeometry, rightWingMaterial);
    rightWing.position.set(0, 0.1, -0.65); 
    rightWing.rotation.z = - Math.PI / 2; 
    rightWing.rotation.x = - 4;
    rightWing.name = "rightEar";
    penguin.add(rightWing);

    // legs
    const leftLegGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
    const leftLegMaterial = new THREE.MeshBasicMaterial({ color: "orange" });
    const leftLeg = new THREE.Mesh(leftLegGeometry, leftLegMaterial);
    leftLeg.position.set(0.6, -0.9, 0.3);
    leftLeg.rotation.z = Math.PI / 2;
    leftLeg.name = "frontLeg";
    penguin.add(leftLeg);
    const rightLegGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
    const rightLegMaterial = new THREE.MeshBasicMaterial({ color: "orange" });
    const rightLeg = new THREE.Mesh(rightLegGeometry, rightLegMaterial);
    rightLeg.position.set(0.6, -0.9, -0.3);
    rightLeg.rotation.z = Math.PI / 2;
    rightLeg.name = "rearLeg";
    penguin.add(rightLeg);

    penguin.scale.set(2.5,2.5,2.5);

    penguin.rotation.y = Math.random() * Math.PI * 2;

    scene.add(penguin);

    return penguin;
}

// generate 2 penguins
function penguins(){
    let penguin1 = penguin();
    penguin1.position.set(Math.random() * 20 + 23, 
    0.75, 
    Math.random() * 20 +23); 
    scene.add(penguin1);

    let penguin2 = penguin();
    penguin2.position.set(Math.random() * 20 +23, 
    0.75, 
    -Math.random() * 20 +23); 
    scene.add(penguin2);
}

function reindeer(){
    const reindeer = new THREE.Group();

    // body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 16);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 0.3, 0);
    body.rotation.z = Math.PI / 2; 
    body.name = "body";
    reindeer.add(body);


    // tail
    const tailGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
    const tailMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(1.1, 0.2, 0);
    tail.rotation.z = - Math.PI / 1.5; 
    tail.name = "tail";
    reindeer.add(tail);

    // head
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(-1, 1, 0);
    head.name = "head";
    reindeer.add(head);

    // nose
    const noseGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const noseMaterial = new THREE.MeshBasicMaterial({ color: "red" });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(-1.6, 0.9, 0);
    nose.name = "nose";
    reindeer.add(nose);

    // eyes
    const eyeOneGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeOneMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const eyeOne = new THREE.Mesh(eyeOneGeometry, eyeOneMaterial);
    eyeOne.position.set(-1.3, 1.2, 0.2);
    eyeOne.name = "eyeOne";
    reindeer.add(eyeOne);
    const eyeTwoGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeTwoMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const eyeTwo = new THREE.Mesh(eyeTwoGeometry, eyeTwoMaterial);
    eyeTwo.position.set(-1.3, 1.2, -0.2);
    eyeTwo.name = "eyeTwo";
    reindeer.add(eyeTwo);

    // pupils
    const eyeLeftGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeLeftMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const eyeLeft = new THREE.Mesh(eyeLeftGeometry, eyeLeftMaterial);
    eyeLeft.position.set(-1.5, 1.2, 0.2);
    eyeLeft.name = "eyeLeft";
    reindeer.add(eyeLeft);
    const eyeRightGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeRightMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const eyeRight = new THREE.Mesh(eyeRightGeometry, eyeRightMaterial);
    eyeRight.position.set(-1.5, 1.2, -0.2);
    eyeRight.name = "eyeRight";
    reindeer.add(eyeRight);

    // left antler
    const leftEarGroup = new THREE.Group();
    const leftEarGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16);
    const leftEarMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const leftEar = new THREE.Mesh(leftEarGeometry, leftEarMaterial);
    leftEar.position.set(0, 0, 0);
    leftEar.name = "baseLeft";
    leftEarGroup.add(leftEar);

    const leftEarOneGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 16);
    const leftEarOneMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const leftEarOne = new THREE.Mesh(leftEarOneGeometry, leftEarOneMaterial);
    leftEarOne.position.set(0, 0.35, 0.22);
    leftEarOne.rotation.x = - Math.PI / 1.3; 
    leftEarOne.name = "leftOne";
    leftEarGroup.add(leftEarOne);

    const leftEarTwoGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 16);
    const leftEarTwoMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const leftEarTwo = new THREE.Mesh(leftEarTwoGeometry, leftEarTwoMaterial);
    leftEarTwo.position.set(0, 0.87, 0.5);
    leftEarTwo.rotation.x = - Math.PI / 1.09; 
    leftEarTwo.name = "leftTwo";
    leftEarGroup.add(leftEarTwo);


    const leftEarThreeGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 16);
    const leftEarThreeMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const leftEarThree = new THREE.Mesh(leftEarThreeGeometry, leftEarThreeMaterial);
    leftEarThree.position.set(0, 0.58, 0.2);
    leftEarThree.rotation.x = Math.PI / 1.5; 
    leftEarThree.name = "leftThree";
    leftEarGroup.add(leftEarThree);

    const leftEarFourGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16);
    const leftEarFourMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const leftEarFour = new THREE.Mesh(leftEarFourGeometry, leftEarFourMaterial);
    leftEarFour.position.set(0, 0.78, 0.01);
    leftEarFour.rotation.x = Math.PI / 1.1; 
    leftEarFour.name = "leftFour";
    leftEarGroup.add(leftEarFour);

    const leftEarFiveGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.32, 16);
    const leftEarFiveMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const leftEarFive = new THREE.Mesh(leftEarFiveGeometry, leftEarFiveMaterial);
    leftEarFive.position.set(0, 0.9, 0.4);
    leftEarFive.rotation.x = Math.PI / 1.3; 
    leftEarFive.name = "leftFive";
    leftEarGroup.add(leftEarFive);

    leftEarGroup.position.set(-1, 1.6, 0.2);
    reindeer.add(leftEarGroup);

    // right antler
    const rightEarGroup = new THREE.Group();
    const rightEarGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16);
    const rightEarMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const rightEar = new THREE.Mesh(rightEarGeometry, rightEarMaterial);
    rightEar.position.set(0, 0, 0);
    rightEar.name = "baseRight";
    rightEarGroup.add(rightEar);

    const rightEarOneGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 16);
    const rightEarOneMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const rightEarOne = new THREE.Mesh(rightEarOneGeometry, rightEarOneMaterial);
    rightEarOne.position.set(0, 0.35, -0.22);
    rightEarOne.rotation.x = Math.PI / 1.3;
    rightEarOne.name = "rightOne";
    rightEarGroup.add(rightEarOne);

    const rightEarTwoGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 16);
    const rightEarTwoMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const rightEarTwo = new THREE.Mesh(rightEarTwoGeometry, rightEarTwoMaterial);
    rightEarTwo.position.set(0, 0.87, -0.5);
    rightEarTwo.rotation.x = Math.PI / 1.09;
    rightEarTwo.name = "rightTwo";
    rightEarGroup.add(rightEarTwo);

    const rightEarThreeGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 16);
    const rightEarThreeMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const rightEarThree = new THREE.Mesh(rightEarThreeGeometry, rightEarThreeMaterial);
    rightEarThree.position.set(0, 0.58, -0.2);
    rightEarThree.rotation.x = -Math.PI / 1.5;
    rightEarThree.name = "rightThree";
    rightEarGroup.add(rightEarThree);

    const rightEarFourGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16);
    const rightEarFourMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const rightEarFour = new THREE.Mesh(rightEarFourGeometry, rightEarFourMaterial);
    rightEarFour.position.set(0, 0.78, -0.01);
    rightEarFour.rotation.x = -Math.PI / 1.1;
    rightEarFour.name = "rightFour";
    rightEarGroup.add(rightEarFour);

    const rightEarFiveGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.32, 16);
    const rightEarFiveMaterial = new THREE.MeshBasicMaterial({ color: "#97594C" });
    const rightEarFive = new THREE.Mesh(rightEarFiveGeometry, rightEarFiveMaterial);
    rightEarFive.position.set(0, 0.9, -0.4);
    rightEarFive.rotation.x = -Math.PI / 1.3;
    rightEarFive.name = "rightFive";
    rightEarGroup.add(rightEarFive);

    rightEarGroup.position.set(-1, 1.6, -0.2);
    reindeer.add(rightEarGroup);

    // front left leg
    const frontLeftLegGroup = new THREE.Group();
    const frontLeftLegCylinder1Geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
    const frontLeftLegCylinder1Material = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const frontLeftLegCylinder1 = new THREE.Mesh(frontLeftLegCylinder1Geometry, frontLeftLegCylinder1Material);
    frontLeftLegCylinder1.position.set(0, -0.175, 0);
    frontLeftLegCylinder1.name = "frontLeftLegCylinder1";
    frontLeftLegGroup.add(frontLeftLegCylinder1);

    const frontLeftLegCylinder2Geometry = new THREE.CylinderGeometry(0.08, 0.08, 1, 16);
    const frontLeftLegCylinder2Material = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const frontLeftLegCylinder2 = new THREE.Mesh(frontLeftLegCylinder2Geometry, frontLeftLegCylinder2Material);
    frontLeftLegCylinder2.position.set(0, -0.525, 0);
    frontLeftLegCylinder2.name = "frontLeftLegCylinder2";
    frontLeftLegGroup.add(frontLeftLegCylinder2);

    frontLeftLegGroup.position.set(0.7, -0.1, 0.2);
    reindeer.add(frontLeftLegGroup);

    // front right leg
    const frontRightLegGroup = new THREE.Group();
    const frontRightLegCylinder1Geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
    const frontRightLegCylinder1Material = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const frontRightLegCylinder1 = new THREE.Mesh(frontRightLegCylinder1Geometry, frontRightLegCylinder1Material);
    frontRightLegCylinder1.position.set(0, -0.175, 0);
    frontRightLegCylinder1.name = "frontRightLegCylinder1";
    frontRightLegGroup.add(frontRightLegCylinder1);

    const frontRightLegCylinder2Geometry = new THREE.CylinderGeometry(0.08, 0.08, 1, 16);
    const frontRightLegCylinder2Material = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const frontRightLegCylinder2 = new THREE.Mesh(frontRightLegCylinder2Geometry, frontRightLegCylinder2Material);
    frontRightLegCylinder2.position.set(0, -0.525, 0);
    frontRightLegCylinder2.name = "frontRightLegCylinder2";
    frontRightLegGroup.add(frontRightLegCylinder2);

    frontRightLegGroup.position.set(-0.35, -0.1, 0.2);
    reindeer.add(frontRightLegGroup);

    // rear left leg
    const rearLeftLegGroup = new THREE.Group();
    const rearLeftLegCylinder1Geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
    const rearLeftLegCylinder1Material = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const rearLeftLegCylinder1 = new THREE.Mesh(rearLeftLegCylinder1Geometry, rearLeftLegCylinder1Material);
    rearLeftLegCylinder1.position.set(0, -0.175, 0);
    rearLeftLegCylinder1.name = "rearLeftLegCylinder1";
    rearLeftLegGroup.add(rearLeftLegCylinder1);

    const rearLeftLegCylinder2Geometry = new THREE.CylinderGeometry(0.08, 0.08, 1, 16);
    const rearLeftLegCylinder2Material = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const rearLeftLegCylinder2 = new THREE.Mesh(rearLeftLegCylinder2Geometry, rearLeftLegCylinder2Material);
    rearLeftLegCylinder2.position.set(0, -0.525, 0);
    rearLeftLegCylinder2.name = "rearLeftLegCylinder2";
    rearLeftLegGroup.add(rearLeftLegCylinder2);

    rearLeftLegGroup.position.set(0.7, -0.1, -0.1);
    reindeer.add(rearLeftLegGroup);

    // rear right leg
    const rearRightLegGroup = new THREE.Group();
    const rearRightLegCylinder1Geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
    const rearRightLegCylinder1Material = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const rearRightLegCylinder1 = new THREE.Mesh(rearRightLegCylinder1Geometry, rearRightLegCylinder1Material);
    rearRightLegCylinder1.position.set(0, -0.175, 0);
    rearRightLegCylinder1.name = "rearRightLegCylinder1";
    rearRightLegGroup.add(rearRightLegCylinder1);

    const rearRightLegCylinder2Geometry = new THREE.CylinderGeometry(0.08, 0.08, 1, 16);
    const rearRightLegCylinder2Material = new THREE.MeshBasicMaterial({ color: "#6C392F" });
    const rearRightLegCylinder2 = new THREE.Mesh(rearRightLegCylinder2Geometry, rearRightLegCylinder2Material);
    rearRightLegCylinder2.position.set(0, -0.525, 0);
    rearRightLegCylinder2.name = "rearRightLegCylinder2";
    rearRightLegGroup.add(rearRightLegCylinder2);

    rearRightLegGroup.position.set(-0.35, -0.1, -0.1);
    reindeer.add(rearRightLegGroup);

    // sleigh
    const sleighGroup = new THREE.Group();
    sleighGroup.name = "sleighGroup";
    const sleighBaseGeometry = new THREE.BoxGeometry(5, 2, 0.6);
    const sleighBaseMaterial = new THREE.MeshBasicMaterial({ color: "#7B110D" });
    const sleighBase = new THREE.Mesh(sleighBaseGeometry, sleighBaseMaterial);
    sleighBase.position.set(4.4, 0.8, 0.15);
    sleighBase.rotation.x = Math.PI / 2;
    sleighGroup.add(sleighBase);

    const sleighFrontGeometry = new THREE.CylinderGeometry(0.6, 0.6, 2, 16, 1, false, Math.PI, Math.PI);
    const sleighFrontMaterial = new THREE.MeshBasicMaterial({ color: "#7B110D" });
    const sleighFront = new THREE.Mesh(sleighFrontGeometry, sleighFrontMaterial);
    sleighFront.rotation.x = Math.PI / 2;
    sleighFront.position.set(2, 1.2, 0.15);
    sleighGroup.add(sleighFront);

    const rodGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 16);
    const rodMaterial = new THREE.MeshBasicMaterial({ color: "#964B00" });

    const ropeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 16);
    const ropeMaterial = new THREE.MeshBasicMaterial({ color: "#964B00" });

    // left rod
    const leftRod = new THREE.Mesh(rodGeometry, rodMaterial);
    leftRod.rotation.z = Math.PI / 2;
    leftRod.position.set(4, 0.3, -0.5);
    sleighGroup.add(leftRod);

    // right rod
    const rightRod = new THREE.Mesh(rodGeometry, rodMaterial);
    rightRod.rotation.z = Math.PI / 2;
    rightRod.position.set(4, 0.3, 0.5);
    sleighGroup.add(rightRod);

    // left rope
    const leftRope = new THREE.Mesh(ropeGeometry, ropeMaterial);
    leftRope.rotation.z = Math.PI / 2;
    leftRope.position.set(1, 1.7, -0.5);
    sleighGroup.add(leftRope);

    // right rope
    const rightRope = new THREE.Mesh(ropeGeometry, ropeMaterial);
    rightRope.rotation.z = Math.PI / 2;
    rightRope.position.set(1, 1.7, 0.5);
    sleighGroup.add(rightRope);

    sleighGroup.position.set(0, -1, 0); 
    reindeer.add(sleighGroup);

    // Exclamation mark Variables
    let loadedModelThree;
    const gltfLoaderThree = new GLTFLoader();
    gltfLoaderThree.load("assets/exclamation_bubble/scene.gltf", (gltfScene) => {
        loadedModelThree = gltfScene;
        gltfScene.scene.position.x = -1;
        gltfScene.scene.position.y = 2.7;
        gltfScene.scene.position.z = 0.9;
        gltfScene.scene.rotation.y = Math.PI / 2;
        gltfScene.scene.scale.set(0.3,0.3,0.3);
        reindeer.add(gltfScene.scene);
    });

    reindeer.scale.set(3,3,3);

    reindeer.position.set(Math.random() * 20 + 23, 
    2.5, 
    Math.random() * 20 +23); 

    scene.add(reindeer);

    return reindeer;
}

// move reindeer with keyboard


let direction;

function handleKeyDown(event) {
    const step = 1.5; 

    // if direction is not set or key pressed is different from current key, update direction
    if (!direction || (direction !== event.key && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key))) {
        direction = event.key;
    }

    switch (direction) {
        case "ArrowUp":
            rudolph.rotation.y = Math.PI * 1.5; 
            rudolph.position.z -= step; 
            break;
        case "ArrowDown":
            rudolph.rotation.y = Math.PI * 0.5; 
            rudolph.position.z += step; 
            break;
        case "ArrowLeft":
            rudolph.rotation.y = 0; 
            rudolph.position.x -= step; 
            break;
        case "ArrowRight":
            rudolph.rotation.y = Math.PI; 
            rudolph.position.x += step;
            break;
    }
}


// fly-through
function flyThrough() {
    if (flyThroughControls.playFlyThrough) {
        speed += 0.001;
        if (speed > 1) speed = 0;

        const position = curve.getPointAt(speed);
        camera.position.set(position.x, position.y, position.z);

        const lookAtPosition = curve.getPointAt((speed + 0.01) % 1);
        camera.lookAt(lookAtPosition);
    }
}

let ogPosition = new THREE.Vector3();
let ogRotation = new THREE.Euler();

function rudolphToggle(enablePOV) {
    if (enablePOV) {
        // store the current camera position and rotation to restore
        ogPosition.copy(camera.position);
        ogRotation.copy(camera.rotation);
    } else {
        // restore
        camera.position.copy(ogPosition);
        camera.rotation.copy(ogRotation);
    }
}






