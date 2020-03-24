let mdcCss = new CSSStyleSheet()
mdcCss.replace( "@import url(style/materialize.min.css)");

let defineComponent = function(name, componentClass) {
    let stylesheets = [mdcCss];
    if (componentClass.style) {
        let innerCss = new CSSStyleSheet();
        let styleWithoutTags = componentClass.style.replace(/<\/?style>/g, '');
        innerCss.replace(styleWithoutTags);
        stylesheets.push(innerCss);
    }

    componentClass.stylesheets = stylesheets;

    window.customElements.define(name, componentClass);
}

class MdcComponent extends HTMLElement {
    static template = '';

    constructor() {
        super();
        this.model = null;
        this.elements = {};
    }

    connectedCallback() {
        this.attachShadow({ mode : 'open' });
        this.shadowRoot.innerHTML = this.constructor.template;
        this.shadowRoot.adoptedStyleSheets = this.constructor.stylesheets;
        this.loadElements();
        this.afterRender();
    }

    afterRender() {

    }

    loadElements() {  
        this.shadowRoot.querySelectorAll('[id]').forEach(el => {
            this.elements[el.id] = el;
        })
    }

}


export {
    MdcComponent,
    defineComponent
}