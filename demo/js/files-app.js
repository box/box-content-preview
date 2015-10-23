'use strict';

var host = window.sessionStorage.getItem('host');
var token = window.sessionStorage.getItem('token');
var sharedLink = window.sessionStorage.getItem('sharedLink');
var fileList = document.querySelector('.file-list');
var content = document.querySelector('.content');
var template = '<tr><td><a href="/preview/{{id}}">{{name}}</a></td></tr>';
var collection = [];

if (host) document.querySelector('.host').value = host;
if (token) document.querySelector('.token').value = token;
if (sharedLink) document.querySelector('.shared-link').value = sharedLink;

function createSharedItemUrl() {
    return host + '/2.0/shared_items';
}

function createFolderUrl(id) {
    return host + '/2.0/folders/' + id;
}

function init() {
    host = document.querySelector('.host').value;
    window.sessionStorage.setItem('host', host);

    token = document.querySelector('.token').value;
    window.sessionStorage.setItem('token', token);

    sharedLink = document.querySelector('.shared-link').value;
    window.sessionStorage.setItem('sharedLink', sharedLink);   
}

function createFileList(files) {
    var html = fileList.innerHTML;
    files.forEach(function(file) {
        collection.push(file.id);
        html += template.replace('{{id}}', file.id).replace('{{name}}', file.name);
    });
    fileList.innerHTML = html;
}

function getFolder(id) {
    fetch(createFolderUrl(id), {
        headers: {  
            'Authorization': 'Bearer ' + token,
            'BoxApi': 'shared_link=' + sharedLink
        }
    })
    .then((response) => response.json())
    .then((folder) => {
        createFileList(folder.item_collection.entries); 
    });
}

function getSharedItem() {
    fetch(createSharedItemUrl(), {
        headers: {  
            'Authorization': 'Bearer ' + token,
            'BoxApi': 'shared_link=' + sharedLink
        }
    })
    .then((response) => response.json())
    .then((sharedItem) => {
        getFolder(sharedItem.id); 
    });
}

function showPreview(id) {
    content.parentNode.style.visibility = 'visible';
    Box.Preview.show(id, collection, content, {
        api: host,
        cdn: 'dist',
        authToken: token,
        locale: 'en-US'
    });
}

function closePreview() {
    content.parentNode.style.visibility = 'hidden';
    content.innerHTML = '';
}

function load() {
    init();
    getSharedItem();
    fileList.addEventListener('click', function(event) {
        event.preventDefault();
        showPreview(event.target.href.substring(event.target.href.lastIndexOf('/') + 1));
    });
}

$('.modal').modal();