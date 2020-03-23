let mdcCss = new CSSStyleSheet()
mdcCss.replace( "@import url(style/material-components-web.min.css)");

let defineComponent = function(name, componentClass) {
    let stylesheets = [mdcCss];
    if (componentClass.style) {
        let innerCss = new CSSStyleSheet();
        innerCss.replace(componentClass.style);
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
        this.afterRender();
    }

    afterRender() {

    }
}


export {
    MdcComponent,
    defineComponent
}