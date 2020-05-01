window.test = function() {

    let main = document.querySelector('main-component');
    main.elements.welcome.hidden = true;
    main.elements.videoContainer.hidden = false;
    let grid = main.elements.remoteVideosContainer;
    
    window.calcCols = function() {
        let vidCount = grid.querySelectorAll('video').length;
        let colCount = Math.ceil(Math.sqrt(vidCount));
        let rowCount = Math.ceil(vidCount / colCount);
        grid.style.setProperty('--column-count', colCount);
        grid.style.setProperty('--row-count', rowCount);
    }
    
    
    window.addVideo = function (portrait = false) {
        let videoContainer = document.createElement('div');
        videoContainer.classList.add('remoteVideoWrapper');
        let video = document.createElement('video');
        //let video = document.createElement('div');
        video.classList.add('remoteVideo');
        videoContainer.classList.add(portrait ? 'portrait' : 'landscape');
        video.autoplay = true;
        video.muted = true;

        video.src = portrait ? "../cssGames/flex/portrait.mp4" : "https://www.html5rocks.com/en/tutorials/video/basics/devstories.webm";
        video.type ="video/mp4";
    
        videoContainer.appendChild(video);
        grid.appendChild(videoContainer);
        //media.then(() => video.srcObject = videoStream );
        calcCols();
        return video;
    }

    window.addStyle = function() {
        let style = document.createElement('style');
        style.innerText = `div.remoteVideoWrapper { 
            width: 100%;
            height: 100%;
         } #remoteVideosContainer {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(6, 1fr);
            overflow: scroll;
         } .remoteVideo {}  .portrait { grid-row: span 2;} .landscape {
            grid-column: span 2;
         }`;
        document.querySelector('main-component').elements.main.appendChild(style)   
        window.s = style;
    }
    
    window.addVideo = addVideo;
    
    addVideo();
    addVideo(true);
    addVideo();
    addVideo(true);
    }

    test();
    