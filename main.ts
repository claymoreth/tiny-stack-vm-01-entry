import { readFileSync as rf, writeFileSync as wf, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
const IN = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
// Tiny stack VM, ISA v1. Binary ops 0x10..0x22 by (op-0x10); holes at 0x17, 0x1b, 0x1f.
const B=[(a,b)=>(a+b)|0,(a,b)=>(a-b)|0,Math.imul,(a,b)=>a===-2147483648&&b===-1?a:(a/b)|0,(a,b)=>b===-1?0:(a%b)|0,(a,b)=>Math.floor((a>>>0)/(b>>>0))|0,(a,b)=>((a>>>0)%(b>>>0))|0,,(a,b)=>a&b,(a,b)=>a|b,(a,b)=>a^b,,(a,b)=>a<<(b&31),(a,b)=>a>>(b&31),(a,b)=>(a>>>(b&31))|0,,(a,b)=>a===b?1:0,(a,b)=>a<b?1:0,(a,b)=>(a>>>0)<(b>>>0)?1:0];
// [imm,pops,pushes] for opcodes that are neither HALT/RET [0,0,0] nor a binary op [0,2,1].
const T={1:[1,0,1],2:[4,0,1],3:[0,1,0],4:[0,1,2],5:[0,2,2],6:[0,2,3],7:[0,3,3],23:[0,1,1],27:[0,1,1],48:[2,0,0],49:[2,1,0],50:[2,1,0],51:[2,0,0],64:[0,1,1],65:[0,2,0],80:[0,1,0],81:[0,1,0],82:[0,0,1],83:[0,1,0]};
function run(p,inp){
const A=n=>new Int32Array(n),D=A(256),C=A(64),M=A(256),out=new Uint8Array(65536);
let pc=0,sp=0,cp=0,ip=0,ol=0,st=0;
const done=c=>[c,out.subarray(0,ol)];
const rel=n=>((p[n-2]|p[n-1]<<8)<<16)>>16;
for(;;){
if(st===1e6)return done(10);
if(pc<0||pc>=p.length)return done(9);
const op=p[pc],t=T[op]??(op===0||op===52?[0,0,0]:B[op-16]?[0,2,1]:0);
if(!t)return done(5);
if(pc+t[0]>=p.length)return done(9);
st++;
const next=pc+1+t[0];
if(sp<t[1])return done(2);
if(sp-t[1]+t[2]>256)return done(3);
pc=next;
switch(op){
case 0:return done(0);
case 1:D[sp++]=p[next-1]<<24>>24;break;
case 2:D[sp++]=p[next-4]|p[next-3]<<8|p[next-2]<<16|p[next-1]<<24;break;
case 3:sp--;break;
case 4:D[sp]=D[sp-1];sp++;break;
case 5:[D[sp-1],D[sp-2]]=[D[sp-2],D[sp-1]];break;
case 6:D[sp]=D[sp-2];sp++;break;
case 7:[D[sp-3],D[sp-2],D[sp-1]]=[D[sp-2],D[sp-1],D[sp-3]];break;
case 23:D[sp-1]=-D[sp-1]|0;break;
case 27:D[sp-1]=~D[sp-1];break;
case 48:pc=next+rel(next);break;
// JZ (49) jumps if v==0, JNZ (50) if v!=0.
case 49:case 50:if((D[--sp]===0)===(op===49))pc=next+rel(next);break;
case 51:if(cp===64)return done(7);C[cp++]=next;pc=p[next-2]|p[next-1]<<8;break;
case 52:if(cp===0)return done(8);pc=C[--cp];break;
case 64:{const a=D[sp-1];if(a<0||a>=256)return done(6);D[sp-1]=M[a];break;}
case 65:{const a=D[sp-1],v=D[sp-2];if(a<0||a>=256)return done(6);sp-=2;M[a]=v;break;}
case 80:{const y=new TextEncoder().encode(String(D[sp-1]));if(ol+y.length>65536)return done(11);sp--;out.set(y,ol);ol+=y.length;break;}
case 81:if(ol+1>65536)return done(11);out[ol++]=D[--sp]&255;break;
case 82:D[sp++]=ip<inp.length?inp[ip++]:-1;break;
case 83:return done(D[--sp]&255);
default:{const b=D[sp-1],a=D[sp-2];if(op>=19&&op<=22&&b===0)return done(4);D[sp-2]=B[op-16](a,b);sp--;break;}
}
}
}
for(const id of readdirSync(IN).sort()){
const [c,o]=run(rf(join(IN,id,"program.bin")),rf(join(IN,id,"input.bin")));
const d=join(OUT,id);mkdirSync(d,{recursive:true});
wf(join(d,"stdout.bin"),o);wf(join(d,"exit.txt"),c+"\n");
}
