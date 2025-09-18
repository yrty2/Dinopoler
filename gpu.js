const multisampling=4;

const computeShaderModule = device.createShaderModule({
    code: `
      struct Input {
        data: array<f32>,
      };

      struct Output {
        data: array<f32>,
      };

      @group(0) @binding(0)
      var<storage, read> input : Input;

      @group(0) @binding(1)
      var<storage, read_write> output : Output;

      @compute @workgroup_size(4)
      fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        output.data[global_id.x] = input.data[global_id.x] * 2.0;
      }
    `
});

function generateInstance(){
inst=[];
    for(const o of obj){
      if(!pose || o.info.name=="pose"){
      const id=mother(o.motherid);//ラグの原因<-改善？
            if(id!=-1){
                if(entity[id].info.attribute!="player"){
                o.mov=entity[id].mov.slice();
        o.info=entity[id].info;
        o.size=entity[id].scale;
        o.rot=entity[id].rot;
                }
            }
      if(!o.info.hide && (o.info.attribute!="point" || !deciding)){
        if(!modelLoaded || o.info.attribute=="util" || (-1.1/aspect<o.mov[0]+camera[0] && o.mov[0]+camera[0]<1.1/aspect && -1<o.mov[1]+camera[1] && o.mov[1]+camera[1]<1)){
        inst.push(o.color[0]);
        inst.push(o.color[1]);
        inst.push(o.color[2]);
        inst.push(o.rot);
        inst.push(o.mov[0]);
        inst.push(o.mov[1]);
        inst.push(o.position[0]);
        inst.push(o.position[1]);
        inst.push(o.direction[0]);
        inst.push(o.direction[1]);
        inst.push(o.size);
        if(o.info.attribute!="util" || o.info.dynamic){
          inst.push(1);
        }else{
          inst.push(0);
        }
      }
      }
    }
  }
};
async function init(){
  if(canvas.width!=window.innerWidth){
  canvas.width=window.innerWidth;
canvas.height=window.innerHeight;
  }
// webgpuコンテキストの取得
const context = canvas.getContext('webgpu');
var multisampleTexture;
// deviceの取得
const g_adapter = await navigator.gpu.requestAdapter();
const g_device = await g_adapter.requestDevice();
//デバイスを割り当て
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device: g_device,
  format: presentationFormat,
  alphaMode: 'opaque'
});
const WGSL=`
struct Uniforms {
  camera : vec2<f32>,
  aspect : vec2<f32>
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragColor : vec4<f32>
}
fn hypot(v:vec2<f32>)->f32{
    return sqrt(pow(v.x,2)+pow(v.y,2));
}
fn rotation(v: vec2<f32>,theta: f32) -> vec2<f32>{
    let u:f32=atan2(v.y,v.x);
    let t:f32=radians(theta);
    return hypot(v)*vec2<f32>(cos(u+t),sin(u+t));
}
@vertex
fn main(@location(0) position: vec2<f32>,@location(1) color: vec3<f32>,@location(2) rot:f32,@location(3) movement:vec2<f32>,@location(4) model: vec2<f32>,@location(5) direction: vec2<f32>,@location(6) size:f32,@location(7) isDinamic:f32) -> VertexOutput {
  var output : VertexOutput;
  var q=rotation((position+model)*direction,rot);
  //q.y*=-1;
  q.x*=size;
  q.y*=size;
  var p=vec4<f32>(0,0,0,0);
  if(isDinamic==0){
  p=vec4<f32>(q+movement,0,1);
  }else{
  p=vec4<f32>(q+movement+uniforms.camera,0,1);
  }
  p*=vec4<f32>(uniforms.aspect.x,-1,1,1);
  output.Position=p;
  output.fragColor=vec4<f32>(color,1);
  return output;
}
@fragment
fn fragmain(@location(0) fragColor: vec4<f32>) -> @location(0) vec4<f32> {
  return fragColor;
}
`;
generateVertex();
function render(){
  canvas.width=window.innerWidth;
canvas.height=window.innerHeight;
//頂点配列
const quadVertexArray = new Float32Array(vertex);
// 頂点データを作成.
const verticesBuffer = g_device.createBuffer({
  size: quadVertexArray.byteLength,
  usage: GPUBufferUsage.VERTEX,
  mappedAtCreation: true,
});
new Float32Array(verticesBuffer.getMappedRange()).set(quadVertexArray);
verticesBuffer.unmap();

//インデックス配列
const quadIndexArray = new Uint16Array(generateIndex());
const indicesBuffer = g_device.createBuffer({
  size: quadIndexArray.byteLength,
  usage: GPUBufferUsage.INDEX,
  mappedAtCreation: true,
});
//マップしたバッファデータをセット
new Uint16Array(indicesBuffer.getMappedRange()).set(quadIndexArray);
indicesBuffer.unmap();

//Uniformバッファ
const uniformBufferSize = 4*(2+2);
  const uniformBuffer = g_device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
var bufferPosition=0;
function bind(a){
const p=new Float32Array(a);
g_device.queue.writeBuffer(
  uniformBuffer,
  bufferPosition,
  p.buffer,
  p.byteOffset,
  p.byteLength
);
bufferPosition+=p.byteLength;
}
bind(camera);
bind([aspect,0]);

//レンダーパイプラインの設定
const pipeline = g_device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: g_device.createShaderModule({
      code: WGSL,
    }),
    entryPoint: 'main',
    buffers: [
      {
        arrayStride: 4*2,
        attributes: [
          {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x2',
          }
        ],
      },
        {//インスタンス
       	  arrayStride: 4*(3+1+2+2+2+1+1),
          stepMode: 'instance',
          attributes: [
            {
			  shaderLocation: 1,
              offset: 0,
              format: 'float32x3'
            },
            {
            shaderLocation: 2,
            offset: 4*3,
            format: 'float32',
            },
            {
            shaderLocation: 3,
            offset: 4*(3+1),
            format: 'float32x2',
            },
            {
              shaderLocation: 4,
              offset: 4*(3+1+2),
              format: 'float32x2'
            },
            {
              shaderLocation: 5,
              offset: 4*(3+1+2+2),
              format: 'float32x2'
            },
            {
              shaderLocation: 6,
              offset: 4*(3+1+2+2+2),
              format: 'float32'
            },
            {
              shaderLocation: 7,
              offset: 4*(3+1+2+2+2+1),
              format: 'float32'
            }
          ]
        }
    ],
  },
  fragment: {
    module: g_device.createShaderModule({
      code: WGSL,
    }),
    entryPoint: 'fragmain',
    //canvasのフォーマットを指定
    targets: [
      {
        format: presentationFormat,
      }
    ]
  },
  multisample:{
      count:multisampling
  },
  primitive: {
    topology: 'triangle-list',
  }
});

//インスタンスバッファを作成
const instancePositions=new Float32Array(inst);
  const instancesBuffer = g_device.createBuffer({
    size: instancePositions.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true
  });
  new Float32Array(instancesBuffer.getMappedRange()).set(instancePositions);
  instancesBuffer.unmap();

//バインドグループを作成
const bindGroup = g_device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      }
    }
  ]
});
//コマンドバッファの作成
const commandEncoder = g_device.createCommandEncoder();
//レンダーパスの設定
const textureView = context.getCurrentTexture().createView();
      if (multisampleTexture) {
        multisampleTexture.destroy();
      }
      multisampleTexture = g_device.createTexture({
        format: context.getCurrentTexture().format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        size: [canvas.width, canvas.height],
        sampleCount: multisampling,
      });
  const renderPassDescriptor= {
    colorAttachments: [
      {
        view: multisampleTexture.createView(),
        resolveTarget:textureView,
        clearValue: clearValue,
        loadOp: 'clear',
        storeOp: 'store',
      },
    ]
  };
  //エンコーダー
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.setVertexBuffer(0, verticesBuffer);
  passEncoder.setIndexBuffer(indicesBuffer, 'uint16');
  passEncoder.setVertexBuffer(1, instancesBuffer);
  passEncoder.drawIndexed(quadIndexArray.length,Math.floor(instancePositions.length/(3+1+2+2+2+1+1)));
  passEncoder.end();
  g_device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(render);
    animation();
}
    render();
}
