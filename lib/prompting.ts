// H3 Max and Turbo share fal's prompt schema and native expansion modes.
// Guidance: https://fal.ai/learn/tools/how-to-use-minimax-h3-max
// Schema: https://fal.ai/models/minimax/h3-max-turbo/text-to-video/api
export const looks:Record<string,string>={
  'As described':'',
  'Super 8':'Super 8 film texture: coarse organic grain, warm colour, soft optical detail, subtle gate weave and gentle exposure variation.',
  'Phone footage':'Casual phone footage with natural exposure, deep focus and small handheld movements.',
  'CCTV':'Fixed high-corner security camera, wide lens, monochrome low-resolution surveillance footage, flat available light, compression artifacts. No camera movement or overlays.',
  'News broadcast':'On-location television news footage, eye-level shoulder-mounted camera, clean broadcast color, even practical lighting, documentary immediacy. No captions or channel graphics.',
  'Glossy commercial':'Premium commercial photography, deliberate close framing, sculpted studio highlights, rich controlled color, pristine optical detail and smooth purposeful camera movement.',
  'Cinematic':'Controlled cinematic lighting, considered composition and natural motion blur.',
};
export type PromptInput={prompt:string;model?:string;duration:number;image?:string;endImage?:string;adapt_prompt?:boolean;look?:string;camera?:string;sound?:string};
export function preparePrompt(input:PromptInput){
  if(input.adapt_prompt===false)return input.prompt;
  if(input.model&&!['minimax/h3-max','minimax/h3-max-turbo'].includes(input.model))return input.prompt;
  const parts=[input.prompt.trim()];
  if(looks[input.look||''])parts.push(`Look: ${looks[input.look!]}`);
  if(input.camera?.trim())parts.push(`Camera: ${input.camera.trim()}`);
  if(input.image)parts.push(input.endImage?'Use the supplied opening and ending frames as the visual endpoints. Follow the described action between them.':'Use the supplied image as the opening frame. Preserve the subject’s identity and established visual details unless the scene description requests a change.');
  if(input.sound?.trim())parts.push(`Sound: ${input.sound.trim()}`);
  return parts.join('\n\n');
}
