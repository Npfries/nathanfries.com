class nfModal extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({
            mode: 'open'
        })
    }
    connectedCallback() {
        let template = document.createElement('template')
        template.innerHTML = `
<style>


#container {
    background-color: lightgray;
    display: table;
    width: 100px;
    height: 30px;
    padding: 5px 10px;
    transition: width 1s;
}

#container:hover {
    cursor: pointer;
}

#container.open:hover {
    cursor: default;
}

#container.open .button:hover {
    cursor: pointer;
}

.button {
    text-align: center;
}

#container.open {
    height: ${this.getAttribute('modal-width')};
    width: ${this.getAttribute('modal-height')};
}

.d-none {
    display: none;
}

</style>

<div id='container'>
    <div id='button' class='button'>${this.getAttribute('button-text')}</div>
    <div id='modal' class='d-none'>Testing</div>
</div>

`
        this.shadowRoot.appendChild(template.content.cloneNode(true))
        this.shadowRoot.getElementById('button').addEventListener('click', () => {
            toggleModal(this)
        })
    }
}

customElements.define('nf-modal', nfModal)

function toggleModal(component) {
    let modal = component.shadowRoot.getElementById('container')
    if (!modal.classList.contains('open')) {
        modal.classList.add('open')
    } else {
        modal.classList.remove('open')
    }
}

