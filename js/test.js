window.test = function() {

let main = document.querySelector('main-component');
main.elements.welcome.hidden = true;
main.elements.videoContainer.hidden = false;
let grid = main.elements.remoteVideosContainer;

let calcCols = function() {
    let vidCount = grid.querySelectorAll('video').length;
    let colCount = Math.ceil(Math.sqrt(vidCount));
    let rowCount = Math.ceil(vidCount / colCount);
    grid.style.setProperty('--column-count', colCount);
    grid.style.setProperty('--row-count', rowCount);
}


let addVideo = function () {
    let videoContainer = document.createElement('div');
    videoContainer.classList.add('remoteVideoWrapper');
    let video = document.createElement('video');
    //let video = document.createElement('div');
    video.classList.add('vid');
    video.autoplay = true;
    video.muted = true;
    video.src = "https://www.html5rocks.com/en/tutorials/video/basics/devstories.webm";
    video.type ="video/mp4";

    videoContainer.appendChild(video);
    grid.appendChild(videoContainer);
    //media.then(() => video.srcObject = videoStream );
    calcCols();
    return video;
}

window.addVideo = addVideo;


    addVideo()
}