import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";
import { GUI } from "dat.gui";
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera = 0;
let renderer = 0;

// initialization of Three.js
function init() {
    // Check if WebGL is available see Three/examples
    // No need for webgl2 here - change as appropriate
    if (WebGL.isWebGLAvailable() === false) {
        // if not print error on console and exit
        document.body.appendChild(WebGL.getWebGLErrorMessage());
    }
    // add our rendering surface and initialize the renderer
    var container = document.createElement("div");
    document.body.appendChild(container);

    // WebGL2 examples suggest we need a canvas
    // canvas = document.createElement( 'canvas' );
    // var context = canvas.getContext( 'webgl2' );
    // var renderer = new THREE.WebGLRenderer( { canvas: canvas, context: context } );
    renderer = new THREE.WebGLRenderer();
    // set some state - here just clear color
    renderer.setClearColor(new THREE.Color(0x333333));
    renderer.setSize(window.innerWidth, window.innerHeight);
    // add the output of the renderer to the html element
    container.appendChild(renderer.domElement);
// All drawing will be organized in a scene graph
    var scene = new THREE.Scene();

    var axes = new THREE.AxesHelper(10);
    scene.add(axes);

    const ambientLight = new THREE.AmbientLight( 0x404040, 54);
    scene.add(ambientLight);

    // instantiate a loader
    const loader = new OBJLoader();

    // //load a resource
    // loader.load(
    //     // resource URL
    //     'models/....obj',
    //     // called when resource is loaded
    //     function ( object ) {

    //         scene.add( object );

    //     },
    //     // called when loading is in progresses
    //     function ( xhr ) {

    //         console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

    //     },
    //     // called when loading has errors
    //     function ( error ) {

    //         console.log( 'An error happened' );

    //     }
    // );
var aspectRatio = window.innerWidth/window.innerHeight;

    // Camera needs to be global
    const camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 1000);

    const controls = new OrbitControls( camera, renderer.domElement );

    // position the camera back and point to the center of the scene
    camera.position.set( 0, 100, 100); 
    // at 0 0 0 on the scene
    camera.lookAt(scene.position); 


    // render the scene
    render();


    function render() {
        // render using requestAnimationFrame - register function
        requestAnimationFrame(render);
        // add an animation for your torus 
        controls.update();

        renderer.render(scene, camera);
    }


}

function onResize() {
    console.log("Resizing");

    var aspect = window.innerWidth / window.innerHeight;
    if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = aspect;
    } else {
        // ToDo: Must update projection matrix
    }
    camera.updateProjectionMatrix();
    // If we use a canvas then we also have to worry of resizing it
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateMatDisplay();
}

window.onload = init;

// register our resize event function
window.addEventListener("resize", onResize, true);