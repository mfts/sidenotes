var DROPBOX_APP_KEY = 'mpbhh63q8ya3ctd';

var currentTable, openDatastore;

var local_storage = chrome.storage.local;
var client = new Dropbox.Client({key: DROPBOX_APP_KEY});
var hashConverter = new Hashes.SHA1;

client.onAuthStepChange.addListener(function(event) {
  if (client.isAuthenticated()) {
    initDatastore(datastoreController.syncRemoteStorage);
  }
});

client.authenticate({interactive:false}, function (error) {
  if (error) {
    client.reset();
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if(tab){ appController.checkForNote(tab);}
});

chrome.tabs.onCreated.addListener(function(tabId, changeInfo, tab) {
   if(tab){ appController.checkForNote(tab);}
});

appController = {
  isAuthenticated: function(){
    return client.isAuthenticated();
  },
  authenticate: function(){
    client.authenticate(function(error){
      if(error){
        client.reset();
      } else {
        chrome.tabs.create({url: "http://sidenotes.co/tutorial"}, function(tab){
          appController.toggleSidePanel();});
      }
    });
  },
  signOut: function(){
    client.signOut(null, function(){
      client.reset();
      appController.closeAllSidePanels();
      appController.changeAllIconsToNormal();
      local_storage.clear();
    });
  },
  closeAllSidePanels: function(){
    chrome.tabs.query( {} ,function (tabs) {
      for (var i = 0; i < tabs.length; i++) {
        chrome.tabs.executeScript(tabs[i].id, {code: 'document.body.style.transform = ""; var sidebar = document.querySelector("#sidenotes_sidebar");document.documentElement.removeChild(sidebar);'
        });

        chrome.browserAction.setIcon({path: {19: "../icon_32.png", 38:"../icon_48.png"}, tabId: tabs[i].id
        });
      }
    });
    changeAllIconsToNormal();
  },
  toggleSidePanelScript: function(){
    var whiteListSites = ["en.wikipedia.org","www.youtube.com", "mail.google.com"];

    var closeSidePanel = function(){
      var sidebar = document.querySelector("#sidenotes_sidebar");
      document.documentElement.removeChild(sidebar);
    };

    var openSidePanel = function(){
      var currentUrl = window.location.toString();
      var newElement = document.createElement("iframe");
      newElement.setAttribute("id", "sidenotes_sidebar");
      newElement.setAttribute("src", "chrome-extension://cjldgloackleekdmeoefgkcmaknnbbpb/html/sidepanel.html#" + currentUrl);
      newElement.setAttribute("style", "z-index: 999999999999999; position: fixed; top: 0px; right: 0px; bottom: 0px; width: 300px; height: 100%; border:0; border-left: 1px solid #eee; box-shadow: 0px -1px 7px 0px #aaa; overflow-x: hidden;");
      newElement.setAttribute("allowtransparency", "false");
      newElement.setAttribute("scrolling", "no");
      document.documentElement.appendChild(newElement);
    };

    var checkWhiteListSites = function(){
      var isWhiteListSite = false;
      for(var i = 0; i < whiteListSites.length; i++){
        if (window.location.href.slice(0).split('/')[2] == whiteListSites[i]){
          isWhiteListSite = true;
          break;
        }
      }
      return isWhiteListSite;
    };

    if (document.querySelector("#sidenotes_sidebar")) {
      document.body.style.transform = "";
      closeSidePanel();
    }
    else if(checkWhiteListSites()){
      document.body.style.transform = "scaleX(0.77) translateX(-15%)";
      openSidePanel();
    }else{
      document.body.style.transform = "scaleX(0.79) translateX(-13.3%)";
      openSidePanel();
    }
  },
  formatScript: function(script, format){
    return script.toString().split("\n").slice(1, -1).join(format);
  },
  toggleSidePanel: function() {
    chrome.tabs.executeScript({code: this.formatScript(this.toggleSidePanelScript, "\n")});
  },
  checkForNote: function(tab){
    tab_url = tab.url.slice(0).split('#')[0];
    local_storage.get(null, function(result){
        if (result[hashConverter.hex(tab_url)]){
          appController.setIconToIndicateNote(tab);
        }
    });
  },
  setIconToIndicateNote: function(tab){
    chrome.browserAction.setIcon({path: {19: "../icon_existing_note.png", 38: "../icon_existing_note.png"}, tabId: tab.id});
  },
  changeAllIconsToNormal: function(){
    chrome.tabs.query(null, function(tabs){
      for(var i=0;i<tabs.length;i++){
        chrome.browserAction.setIcon({path: {19: "../icon_32.png", 38:"../icon_48.png"}, tabId: tabs[i].id});
      }
    });
  }
};

datastoreController = {
  updateOrAddRecord: function(newNote, pastNote, hashKey){
    var newNoteData = this.makeRecord(newNote[hashKey]);
    local_storage.set({saving: 'true'});
    if(pastNote) {
      pastNote.update(newNoteData);
    } else {
      currentTable.insert(newNoteData);
    }

  },
  makeRecord: function(noteData){
    return {
        url: noteData['newValue']['url'],
        body: noteData['newValue']['body'],
        fullname: noteData['newValue']['fullname'],
        lastcontact: noteData['newValue']['lastcontact'],
        angellist: noteData['newValue']['angellist'],
        linkedin: noteData['newValue']['linkedin'],
        company: noteData['newValue']['company'],
        email: noteData['newValue']['email'],
        createdAt: new Date(JSON.parse(noteData['newValue']['createdAt'])),
        updatedAt: new Date()
    };
  },
  setRemoteNoteToLocalStorage: function(newRemoteNotes) {
    local_storage.get(null, function(result){
        var newLocalNotes = datastoreController.mergeNotes(newRemoteNotes, result);
    });
  },
  syncRemoteStorage: function(currentTable){
    local_storage.set({saving: 'false'});
    var datastoreRecords = currentTable.query();
    if(datastoreRecords){
      local_storage.get(null, function(result){
          datastoreController.mergeNotes(datastoreRecords, result);
      });
    }
  },
  mergeNotes: function(datastoreRecords, chromeLocalRecords){
    if(chromeLocalRecords){
      for (var i=0;i<datastoreRecords.length;i++) {
        var noteKey = hashConverter.hex(datastoreRecords[i].get('url'));
        var localMatchNote = chromeLocalRecords[noteKey];
        var newNote = {};
        if(localMatchNote){
          if(localMatchNote['body'].length < datastoreRecords[i].get('body').length){
            newNote[noteKey] = datastoreController.formatForLocalStorage(datastoreRecords[i]);
            local_storage.set(newNote);
          }
        } else {
          newNote[noteKey] = datastoreController.formatForLocalStorage(datastoreRecords[i]);
          local_storage.set(newNote);
        }
      }
    }
  },
  formatForLocalStorage: function(noteData){
    return {'url': noteData.get('url'), 
            'body': noteData.get('body'),
            'fullname': noteData.get('fullname'),
            'lastcontact': noteData.get('lastcontact'),
            'angellist': noteData.get('angellist'),
            'linkedin': noteData.get('linkedin'),
            'company': noteData.get('company'),
            'email': noteData.get('email'),
            'createdAt': JSON.stringify(noteData.get('createdAt')), 'updatedAt': JSON.stringify(new Date())};
  },
  deleteNote: function(noteUrl, element){
    var result = confirm("Are you sure you want to delete this message?");
    if (result === true) {
      element.style.display = 'none';
      var localNoteToDelete = local_storage.remove(hashConverter.hex(noteUrl), function(){});
      var noteToDelete = currentTable.query({url: noteUrl});
      noteToDelete[0].deleteRecord();
    }
  }
};

function initDatastore(callback){
  client.getDatastoreManager().openDefaultDatastore(function (error, datastore) {
    if (error) {
      console.log('Error opening default datastore: ' + error);
    }

    openDatastore = datastore;
    currentTable = datastore.getTable('Sidenotes');

    chrome.storage.onChanged.addListener(function(changes, namespace) {
      var hashKey = Object.keys(changes)[0];
      if(changes[hashKey]['newValue'] && changes[hashKey]['newValue']['url'] && changes[hashKey]['newValue']['body'] && changes[hashKey]['newValue']['fullname'] && changes[hashKey]['newValue']['lastcontact'] && changes[hashKey]['newValue']['angellist'] && changes[hashKey]['newValue']['linkedin'] && changes[hashKey]['newValue']['company'] && changes[hashKey]['newValue']['email']){
        var existingRecord = currentTable.query({url: changes[hashKey]['newValue']['url'] });
        datastoreController.updateOrAddRecord(changes, existingRecord[0], hashKey);

        chrome.tabs.query({currentWindow: true, active: true}, function(tab){
          if(tab[0]){
            appController.checkForNote(tab[0]);
          }
        });

      }
    });

    local_storage.set({saving: 'false'});
    var datastoreRecords = currentTable.query();
    datastoreController.setRemoteNoteToLocalStorage(datastoreRecords);
    callback(currentTable);
  });
};
