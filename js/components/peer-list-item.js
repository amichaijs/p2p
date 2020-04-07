import { MdcComponent, defineComponent } from './mdc-component.js'

let template = html`
<span class="title" id="title">Title</span>
<a href="#!" class="secondary-content"><i class="material-icons">grade</i></a>
`
class PeerListItem extends MdcComponent {


    constructor() {
        super();
    }

    afterRender() {
        
    }
}

defineComponent('peer-list-item', PeerListItem, { template });