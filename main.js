function openPage(event, title) {
    console.log("open page", title)
    
    var href = document.location.href
    console.log(href)
    
    document.location.href = "./" + title
}

class CommonHeader extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="header">
                <div class="tab">
                    <button class="tabitem" onclick="openPage(event, 'home')">Home</button>
                    <button class="tabitem" onclick="openPage(event, 'about')">About</button>
                </div>
            </div>
        `
    }
}
customElements.define('common-header', CommonHeader)

function exports(ready = true) {
    window.openPage = openPage;
    console.log("imported")
    
    if(ready) {
        window.addEventListener('load', function () {
            whenready()
        });
    }
}

function whenready() {
    document.getElementsByClassName('pageContent')[0].classList.remove('hide_till_load')
    document.getElementsByTagName("html")[0].style.visibility = "visible";
}

export { exports, whenready };

