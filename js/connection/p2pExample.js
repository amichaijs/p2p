
function channelHandling() {
    function handleSendChannelStatusChange(event) {
        if (sendChannel) {
            var state = sendChannel.readyState;
        
            if (state === "open") {
            } else {
            }
        }
    }

    sendChannel = localConnection.createDataChannel("sendChannel");
    sendChannel.onopen = handleSendChannelStatusChange;
    sendChannel.onclose = handleSendChannelStatusChange;

    
        //sendChannel.send(message);

        //remote
        remoteConnection = new RTCPeerConnection();
        remoteConnection.ondatachannel = function(event) {
            receiveChannel = event.channel;
            receiveChannel.onmessage = function(event) {
                //event.data
            }
            receiveChannel.onopen = handleReceiveChannelStatusChange;
            receiveChannel.onclose = handleReceiveChannelStatusChange;
        };
}


let connectPeerExplanation = function() {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample
    let connectPeer = function(peerId) {
        try {
            /* method to create an SDP (Session Description Protocol) blob describing the connection we want to make.
             This method accepts, optionally, an object with constraints to be met for the connection to meet your needs, 
             such as whether the connection should support audio, video, or both. In our simple example, we don't have any constraints. */
            let offer = await localConnection.createOffer();
            /* If the offer is created successfully, we pass the blob along to the local connection's RTCPeerConnection.setLocalDescription() method. 
            This configures the local end of the connection. */
            await localConnection.setLocalDescription(offer);
            /* The next step is to connect the local peer to the remote by telling the remote peer about it. 
            This is done by calling remoteConnection.RTCPeerConnection.setRemoteDescription(). Now the remoteConnection knows about the connection that's being built.
             In a real application, this would require a signaling server to exchange the description object.*/
            await remoteConnection.setRemoteDescription(localConnection.localDescription)
    
            /*That means it's time for the remote peer to reply. It does so by calling its createAnswer() method.
             This generates a blob of SDP which describes the connection the remote peer is willing and able to establish.
             This configuration lies somewhere in the union of options that both peers can support.*/
            let answer = await remoteConnection.createAnswer();
            /*Once the answer has been created, it's passed into the remoteConnection by calling RTCPeerConnection.setLocalDescription().
             That establishes the remote's end of the connection (which, to the remote peer, is its local end. This stuff can be confusing, but you get used to it).
             Again, this would normally be exchanged through a signalling server.*/
            await remoteConnection.setLocalDescription(answer);
            /*Finally, the local connection's remote description is set to refer to the remote peer by calling localConnection's RTCPeerConnection.setRemoteDescription().*/
            await localConnection.setRemoteDescription(remoteConnection.localDescription);
        }
        catch (ex) {
            console.error(ex);
            //handleCreateDescriptionError
        }


        
        function disconnectPeers() {
        
            // Close the RTCDataChannels if they're open.
            
            sendChannel.close();
            receiveChannel.close();
            
            // Close the RTCPeerConnections
            
            localConnection.close();
            remoteConnection.close();

            sendChannel = null;
            receiveChannel = null;
            localConnection = null;
            remoteConnection = null;
            
            // Update user interface elements
            
            connectButton.disabled = false;
            disconnectButton.disabled = true;
            sendButton.disabled = true;
            
            messageInputBox.value = "";
            messageInputBox.disabled = true;
        }
    }
}



/*
/* copied from https://jsfiddle.net/53do8fkL/ 
   with extra tweeks 

   var server = { urls: "stun:stun.l.google.com:19302" };

   var dc, pc = new RTCPeerConnection({ iceServers: [server] });
   pc.onaddstream = e => v2.srcObject = e.stream;
   pc.ondatachannel = e => dcInit(dc = e.channel);
   pc.oniceconnectionstatechange = e => log(pc.iceConnectionState);
   
   var haveGum = navigator.mediaDevices.getUserMedia({video:true, audio:true})
     .then(stream => pc.addStream(v1.srcObject = stream)).catch(log);
   
   function dcInit() {
     dc.onopen = () => log("Chat!");
     dc.onmessage = e => log(e.data);
   }
   
   function createOffer() {
     button.disabled = true;
     dcInit(dc = pc.createDataChannel("chat"));
     haveGum.then(() => pc.createOffer()).then(d => pc.setLocalDescription(d))
       .catch(log);
     pc.onicecandidate = e => {
       if (e.candidate) return;
       offer.value = pc.localDescription.sdp;
       offer.select();
       answer.placeholder = "Paste answer here";
     };
   };
   
   function acceptOffer() {
     if (pc.signalingState != "stable") return;
     debugger;
     var offerValue = offer.value.replace(/\n/g, '\r\n');
     var desc = new RTCSessionDescription({ type:"offer", sdp:offerValue });
     pc.setRemoteDescription(desc)
       .then(() => pc.createAnswer()).then(d => pc.setLocalDescription(d))
       .catch(log);
     pc.onicecandidate = e => {
       if (e.candidate) return;
       answer.focus();
       answer.value = pc.localDescription.sdp;
       answer.select();
     };
   };
   
   function copy() {
     document.execCommand('copy');
   }
   
   function acceptAnswer() {
     if (pc.signalingState != "have-local-offer") return;
     debugger;
     var desc = new RTCSessionDescription({ type:"answer", sdp:answer.value });
     pc.setRemoteDescription(desc).catch(log);
   };
   
   chat.onkeypress = e => {
     if (!enterPressed(e)) return;
     dc.send(chat.value);
     log(chat.value);
     chat.value = "";
   };
   
   var enterPressed = e => e.keyCode == 13;
   var log = msg => div.innerHTML += "<p>" + msg + "</p>";

*/