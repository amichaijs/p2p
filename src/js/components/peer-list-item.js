import { MdcComponent, defineComponent } from './mdc-component.js'

class PeerListItem extends MdcComponent {
    static template = html`
      <img src="images/yuna.jpg" alt="" class="circle">
      <span class="title" id="title">Title</span>
      <a href="#!" class="secondary-content"><i class="material-icons">grade</i></a>
    `

    constructor() {
        super();
    }

    afterRender() {
        
    }
}

defineComponent('mdc-button', MdcButton);