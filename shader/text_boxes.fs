#version 300 es
// ==========================================================================
// $Id: text_boxes.fs,v 1.1 2019/03/16 16:44:16 jlang Exp $
// Draw boxes with instancing
// ==========================================================================
// (C)opyright:
//
//   Jochen Lang
//   EECS, University of Ottawa
//   800 King Edward Ave.
//   Ottawa, On., K1N 6N5
//   Canada.
//   http://www.site.uottawa.ca
//
// Creator: jlang (Jochen Lang)
// Email:   jlang@site.uottawa.ca
// ==========================================================================
// $Log: text_boxes.fs,v $
// Revision 1.1  2019/03/16 16:44:16  jlang
// Created lab8 solution.
//
// Revision 1.2  2019/03/09 18:15:33  jlang
// Included solution and starter code.
//
// Revision 1.1  2019/03/08 22:42:46  jlang
// First draft of material lab
//
// Revision 1.4  2019/03/07 05:59:05  jlang
// solution
//
// Revision 1.3  2019/03/07 02:50:03  jlang
// Working dat.gui and basic lighting
//
// Revision 1.2  2019/03/05 18:27:02  jlang
// Implementation complete but still to be debugged.
//
// Revision 1.1  2019/03/04 03:31:17  jlang
// Initial draft. No lighting yet.
// ==========================================================================

#ifdef GL_ES
  precision mediump float;
  precision mediump int;
#endif

uniform sampler2D img2DSampler;

in vec3 f_color;
in vec3 f_normal;
in vec3 f_position;
in vec3 f_eye;
in vec2 f_tex_coord;
flat in int materialId;



out vec4 color;

const int NUM_LIGHTS=2;

struct LightSource {
  vec4 ambient;  
  vec4 diffuse;
  vec4 specular;
  // v is the vector to the vertex
  // if dir*v < cos(cutoff) then (dir * v)^N 
  vec3 spot_direction;
  float spot_exponent;
  float spot_cutoff;
  // spot light
  bool spot_light;
  // attentuation 1/(k_c + k_l r + k_q r^2) 
  // r is the distance of a vertex from the light source
  float constant_attenuation;
  float linear_attenuation;
  float quadratic_attenuation;
};

uniform LightSource lights[NUM_LIGHTS];

// assumed to be in scene coordinates 
uniform vec4 lightPosition[NUM_LIGHTS];

// Materials
struct Material {
  vec4 emissive;
  vec4 ambient;
  vec4 diffuse;
  vec4 specular;
  float shininess;
};

layout (std140) uniform MaterialBlock {
  uniform Material materials[4];	       
};



vec4 lighting( int index, vec3 NVec, vec3 LVec, vec3 EVec ) {
  float distanceLight = length(LVec);

  LVec = normalize(LVec);
  
  float attenuation = 1.0 / 
    (lights[index].constant_attenuation +
     lights[index].linear_attenuation * distanceLight +
     lights[index].quadratic_attenuation * distanceLight * distanceLight);
  // ambient term
  
  int mI = materialId % 4; 

  // ambient term
  vec4 ambient = materials[mI].ambient * lights[index].ambient;

  // diffuse term
  float dotNL = max(0.0,dot(NVec,LVec));
  vec4 diffuse = materials[mI].diffuse * lights[index].diffuse * dotNL;

  vec3 HVec = normalize(LVec+EVec);
  float dotNH = max(0.0,dot(NVec,HVec));
  vec4 specular = materials[mI].specular * lights[index].specular 
       * pow(dotNH,materials[mI].shininess);
  
  // spot light
  float spot_attenuation = 1.0;
  if ( lights[index].spot_light ) {
    float dotSV = -dot(LVec,normalize(lights[index].spot_direction));
    // if ( dotSV < cos(radians(lights[index].spot_cutoff))) {
    if ( dotSV < cos(lights[index].spot_cutoff)) {
      spot_attenuation = 0.0;
    } else {
      spot_attenuation = pow(dotSV,lights[index].spot_exponent);
    }
  }
  vec4 reflect = ambient + attenuation * spot_attenuation * (diffuse+specular);

  return reflect;
}


void main() {
  vec3 NVec = normalize(f_normal);
  vec3 EVec = normalize(f_eye);

  color = texture(img2DSampler, f_tex_coord);
  // Loop over the lights
  for (int i=0; i<NUM_LIGHTS; i++) {   
    // Calculate the light direction w switches between directional and point sources
    vec3 LVec = normalize(lightPosition[i].xyz - lightPosition[i].w*f_position);
    color += 1.0/float(NUM_LIGHTS) * lighting( i, NVec, LVec, EVec );
    // color += 1.0/float(NUM_LIGHTS) * vec4(lights[i].constant_attenuation * abs(LVec) + 0.001 * NVec + 0.001 * EVec + 0.001 * f_color, 1);
  }
}
