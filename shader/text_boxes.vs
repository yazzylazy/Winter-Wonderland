#version 300 es
// ==========================================================================
// $Id: text_boxes.vs,v 1.1 2019/03/16 16:44:16 jlang Exp $
// Draw boxes with instancing
// Based on lit_boxes_sol.vs
// Revision 1.3  2019/03/07 02:50:04  jlang
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
// $Log: text_boxes.vs,v $
// Revision 1.1  2019/03/16 16:44:16  jlang
// Created lab8 solution.
//
// Revision 1.2  2019/03/09 18:15:33  jlang
// Included solution and starter code.
//
// Revision 1.1  2019/03/08 22:42:46  jlang
// First draft of material lab
//
// ==========================================================================

uniform mat4 proj_matrix;
uniform mat4 rot_matrix;

layout (location=0) in vec4 a_vertex;
layout (location=1) in vec3 a_normal;
layout (location=2) in vec3 a_color;

layout (location = 3) in vec2 a_tex_coord;


layout (location = 4) in mat4 model_matrix;	



// Calculate lighting in scene coordinates - different options are possible
out vec3 f_color;
out vec3 f_normal;
out vec3 f_position;
out vec3 f_eye;
flat out int materialId; // depending on instance send material id along 

out vec2 f_tex_coord;

void main() {
	materialId = gl_InstanceID;

  // we need the fragment position in the shader before projection
  vec4 pos = model_matrix * rot_matrix * a_vertex;
  f_position = pos.xyz;
  // Eye position is trivial here as we have not used a lookAt transform
  f_eye = -f_position;
  // If we would have
  // f_eye = - transpose(mat3(view_matrix)) * f_position;
  gl_Position = proj_matrix * pos;
  // Save to simply apply the mat3 as we don't use non-uniform scaling or shearing
  f_normal = mat3(model_matrix * rot_matrix) * a_normal;
  // Otherwise we need to
  // f_normal = mat3(transpose(inverse(model_matrix * rot_matrix))) * a_normal;  
  f_color = a_color;

  f_tex_coord = a_tex_coord;
}
