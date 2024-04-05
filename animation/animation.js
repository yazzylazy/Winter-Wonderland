

export let walkPhase = 0;
export function animateLegs(reindeer) {
    walkPhase += 0.05; // speed of the leg movement

    // amplitude of the leg movement
    const topMovementAmplitude = 0.15; 
    const bottomMovementAmplitude = 0.3; 

    // offset
    const topPhaseOffset = Math.PI / 4; 
    const bottomPhaseOffset = Math.PI;

    const frontTopMovement = Math.sin(walkPhase) * topMovementAmplitude;
    const frontBottomMovement = Math.sin(walkPhase + topPhaseOffset) * bottomMovementAmplitude;
    const rearTopMovement = Math.sin(walkPhase + bottomPhaseOffset) * topMovementAmplitude;
    const rearBottomMovement = Math.sin(walkPhase + bottomPhaseOffset + topPhaseOffset) * bottomMovementAmplitude;

    reindeer.getObjectByName("frontLeftLegCylinder1").rotation.z = frontTopMovement;
    reindeer.getObjectByName("frontLeftLegCylinder2").rotation.z = frontBottomMovement;

    reindeer.getObjectByName("frontRightLegCylinder1").rotation.z = -frontTopMovement;
    reindeer.getObjectByName("frontRightLegCylinder2").rotation.z = -frontBottomMovement;

    reindeer.getObjectByName("rearLeftLegCylinder1").rotation.z = rearTopMovement;
    reindeer.getObjectByName("rearLeftLegCylinder2").rotation.z = rearBottomMovement;

    reindeer.getObjectByName("rearRightLegCylinder1").rotation.z = -rearTopMovement;
    reindeer.getObjectByName("rearRightLegCylinder2").rotation.z = -rearBottomMovement;
}

export let sleighPhase = 0;
export function animateSleigh(reindeer) {
    const sleighSpeed = 0.02; 
    const sleighAmplitude = 0.1;

    sleighPhase += sleighSpeed;
    const sleighRotation = Math.sin(sleighPhase) * sleighAmplitude;

    reindeer.getObjectByName("sleighGroup").rotation.x = sleighRotation;
}

// animation penguin
export function animateLegsPenguin(penguin, clock) {
    const legMovementSpeed = 5; 
    const legAmplitude = 0.2; 

    const frontLegRotation = Math.sin(clock * legMovementSpeed) * legAmplitude;
    const rearLegRotation = Math.sin(clock * legMovementSpeed + Math.PI) * legAmplitude;

    penguin.getObjectByName("frontLeg").rotation.x = frontLegRotation;
    penguin.getObjectByName("rearLeg").rotation.x = rearLegRotation;
}

export function animateArmsPenguin(penguin, clock) {
    const armMovementSpeed = 5; 
    const armAmplitude = 0.3; 

    const leftArmRotation = Math.sin(clock * armMovementSpeed) * armAmplitude;
    const rightArmRotation = Math.sin(clock * armMovementSpeed + Math.PI) * armAmplitude;

    penguin.getObjectByName("leftEar").rotation.x = leftArmRotation; 
    penguin.getObjectByName("rightEar").rotation.x = rightArmRotation; 
}

