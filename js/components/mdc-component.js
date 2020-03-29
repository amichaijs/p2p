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

    if (componentClass.props) {
        observeProps(componentClass)
    }
    
    componentClass.stylesheets = stylesheets;

    window.customElements.define(name, componentClass);
}

let observeProps = function (componentClass) {
    let props = Object.keys(componentClass.props);
    Object.defineProperty(componentClass, 'observedAttributes', {
        get() {
            return props;
        }
    })
}

let setValueHtml = function(value) {
    this.innerText = value;
}

let setValueInput = function(value) {
    this.value  = value;
}

let setValueCheckbox = function(value) {
    this.checked = value;
}

let attachSetValueMethod = (el) => {
    if (el) {
        let setValueMethod = null;
        if (el instanceof HTMLInputElement && el.type == "checkbox") {
            setValueMethod = setValueCheckbox;
        }
        else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement){
            setValueMethod = setValueInput
        }
        else {
            setValueMethod = setValueHtml;
        }

        el.setValue = setValueMethod;
    }
}

class MdcComponent extends HTMLElement {
    static template = '';

    constructor() {
        super();
        this.elements = {};
        this.bindingMap = new Map();
    }

    connectedCallback() {
        this.attachShadow({ mode : 'open' });
        this.shadowRoot.innerHTML = this.constructor.template;
        this.shadowRoot.adoptedStyleSheets = this.constructor.stylesheets;
        this.loadElements();
        this.bindElements();
        this.updateFromAttributes(this.constructor.props);
        this.afterRender();
    }

    afterRender() {

    }

    loadElements() {  
        this.shadowRoot.querySelectorAll('[id]').forEach(el => {
            this.elements[el.id] = el;
            attachSetValueMethod(el);
        })
    }

    bindElements() {
        this.shadowRoot.querySelectorAll('[\\:]').forEach(el => {
            let bindingField = el.getAttribute(':');
            let boundElements = this.bindingMap.get(bindingField);
            if (!boundElements) {
                boundElements = [];
                this.bindingMap.set(bindingField, boundElements);
            }

            boundElements.push(el);
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this.update(name, newValue, oldValue);
    }

    updateFromAttributes(props) {
        if (props) {
            for (let propName in props) {
                this.update(propName, this.getAttribute(propName));
            }
        }
    }
    
    update(name, newValue, oldValue) {
        //TODO: shitty check for now
        let boundElements = this.bindingMap.get(name);
        if (boundElements) {
            boundElements.forEach(el => el.setValue(newValue));
        }
        //let element = this.elements[name];
        //what to do with attributes? built in support? like the input tag inside custom element and want ot change its attirbutes
        //should only update elements?
    }

}


export {
    MdcComponent,
    defineComponent
}