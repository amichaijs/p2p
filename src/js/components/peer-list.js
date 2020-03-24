import { MdcComponent, defineComponent } from './mdc-component.js'

class PeerList extends MdcComponent {
    static template = html`
        <ul id="list" class="collection">
    `

    constructor() {
        super();
    }

    afterRender() {
        
    }

    addPeer(peer) {
        let li = document.createElement('li');
        li.className = 'collection-item avatar'
        let peerItem = document.createElement('peer-list-item');
        li.appendChild(peerItem);
        this.elements.list.appendChild(li);
        return peerItem;
    }
}

defineComponent('mdc-button', MdcButton);