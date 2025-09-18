const BGMList=[document.getElementById("BGM1"),document.getElementById("BGM2"),document.getElementById("BGM3")]
function play(name,volume){
    const a=new Audio();
    a.src=`Sounds/${name}.wav`;
    a.type="audio/wav";
    a.volume=volume;
    a.play();
}
function setBGM(name,volume,loop){
    for(const g of BGMList){
        g.loop=false;
        g.pause();
    }
    const a=document.getElementById(name);
    a.loop=loop;
    a.volume=volume;
    a.play();
}