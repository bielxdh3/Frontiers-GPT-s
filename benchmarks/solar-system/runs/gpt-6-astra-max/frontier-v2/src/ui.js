import { escapeHTML } from './storage.js';
export const e=escapeHTML;
const paths={
 orbit:'<ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="3.5"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
 camera:'<path d="M4 7h4l2-3h4l2 3h4v13H4Z"/><circle cx="12" cy="13" r="4"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 play:'<path d="m9 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',
 back:'<path d="m14 5-7 7 7 7"/>',next:'<path d="m10 5 7 7-7 7"/>',
 reverse:'<path d="M7 7h8a5 5 0 0 1 0 10h-2M7 3 3 7l4 4"/>',
 reset:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
 focus:'<circle cx="12" cy="12" r="5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
 follow:'<circle cx="12" cy="12" r="3"/><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
 compare:'<circle cx="7" cy="13" r="4"/><circle cx="17" cy="10" r="6"/>',
 ruler:'<path d="m3 16 13-13 5 5L8 21Z M13 6l3 3M10 9l2 2M7 12l3 3"/>',
 star:'<path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
 earth:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 saturn:'<circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="12" ry="3" transform="rotate(-25 12 12)"/>',
 spark:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"/>',
 book:'<path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-6-2-10 1ZM12 5v16"/>',
 tools:'<path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L14 9V3M8 14h8"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',
 check:'<path d="m5 12 4 4L20 5"/>',
 moon:'<path d="M19 15A8 8 0 0 1 9 5a9 9 0 1 0 10 10Z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18"/>',
 volume:'<path d="M3 9h4l5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>',
 mute:'<path d="M3 9h4l5-4v14l-5-4H3ZM16 9l6 6M22 9l-6 6"/>',
 save:'<path d="M5 3h14v18l-7-4-7 4Z"/>',
 share:'<circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="m8 11 8-5M8 13l8 5"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'
};
export const icon=(id,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]||paths.orbit}</svg>`;
export function button(action,label,{ico,cls='',value='',title='',disabled=false,pressed,attrs=''}={}){return `<button type="button" class="${cls}" data-action="${e(action)}" ${value!==''?`data-value="${e(value)}"`:''} ${title?`title="${e(title)}"`:''} ${disabled?'disabled':''} ${pressed!==undefined?`aria-pressed="${pressed}"`:''} ${attrs}>${ico?icon(ico):''}<span>${label}</span></button>`;}
export const iconButton=(action,label,ico,options={})=>button(action,`<span class="sr-only">${e(label)}</span>`,{...options,ico,cls:`icon-button ${options.cls||''}`,title:label});
export function select(field,label,options,value,attrs=''){return `<label class="field">${e(label)}<select data-field="${e(field)}" ${attrs}>${options.map(o=>`<option value="${e(o[0])}" ${String(o[0])===String(value)?'selected':''}>${e(o[1])}</option>`).join('')}</select></label>`;}
export function range(field,label,value,min,max,step=1,suffix=''){return `<label class="field range-field"><span>${e(label)} <output>${e(value)}${e(suffix)}</output></span><input type="range" data-field="${e(field)}" min="${min}" max="${max}" step="${step}" value="${value}" /></label>`;}
export function number(field,label,value,min,max,step='any'){return `<label class="field">${e(label)}<input type="number" data-field="${e(field)}" min="${min}" max="${max}" step="${step}" value="${e(value)}" /></label>`;}
export function check(field,label,checked){return `<label class="check-field"><input type="checkbox" data-field="${e(field)}" ${checked?'checked':''}/><span>${e(label)}</span></label>`;}
export const section=(title,body)=>`<section class="tool-section"><h3>${title}</h3>${body}</section>`;
export const notice=(text,kind='info')=>`<p class="notice ${kind}">${text}</p>`;
export const external=(url,title)=>`<a href="${e(url)}" target="_blank" rel="noreferrer noopener">${e(title)} <span aria-hidden="true">↗</span></a>`;
