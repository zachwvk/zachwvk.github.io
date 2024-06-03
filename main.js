function openPage(event, title) {
    console.log("open page", title)
    
    var href = document.location.href
    console.log(href)
    
    document.location.href = "./" + title + ".html"
}

class CommonHeader extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="header">
                <div class="tab">
                    <button class="tabitem" onclick="openPage(event, 'home')">Home</button>
                    <button class="tabitem" onclick="openPage(event, 'resources')">Resources</button>
                    <button class="tabitem" onclick="openPage(event, 'about')">About</button>
                </div>
            </div>
        `
    }
}
customElements.define('common-header', CommonHeader)

function exports() {
    window.openPage = openPage;
    console.log("imported")
    
    document.getElementsByClassName('pageContent')[0].classList.remove('hide_till_load')
}

export { exports };

