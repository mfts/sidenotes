var currentUrl = window.location.hash.slice(1).split('#')[0];
var hashConverter = new Hashes.SHA1;
var noteKey = hashConverter.hex(currentUrl);

document.addEventListener( "DOMContentLoaded", function(){
  var textarea = document.querySelector('#textarea');
  var fullname = document.querySelector('#fullname');
  var lastcontact = document.querySelector('#lastcontact');
  var angellist = document.querySelector('#angellist');
  var linkedin = document.querySelector('#linkedin');
  var company = document.querySelector('#company');
  var email = document.querySelector('#email');
  var inputfield = document.querySelector('.basiccontacts');

  var indicator = document.querySelector('#sync-indicator');
  displayStoredData();
  fullname.focus();

  chrome.storage.onChanged.addListener(function(changes, namespace) {
    chrome.storage.local.get(null, function(result){
      if(result['saving']==='true'){
        indicator.style.background='#2ECC71';
        displayStoredData();
      } else {
        indicator.style.background='#f5d44f';
      }
    });
  });

  function getNewIframeData() {
    if (textarea.value || fullname.value || lastcontact.value || angellist.value || linkedin.value || company.value || email.value){
      storeIframeData();
    }
  }

  function storeIframeData(){
    var note = {};
    chrome.storage.local.get(null, function(results){
        if(results[noteKey]){
          note[noteKey] = {'url': currentUrl,

                           'body': JSON.stringify(textarea.value), 
                           'fullname': JSON.stringify(fullname.value),
                           'lastcontact': JSON.stringify(lastcontact.value),
                           'angellist': JSON.stringify(angellist.value),
                           'linkedin': JSON.stringify(linkedin.value),
                           'company': JSON.stringify(company.value),
                           'email': JSON.stringify(email.value),

                           'createdAt': results[noteKey].createdAt, 
                           'updatedAt': JSON.stringify(new Date()) 
                         };
        } else {
          note[noteKey] = {'url': currentUrl,

                           'body': JSON.stringify(textarea.value), 
                           'fullname': JSON.stringify(fullname.value),
                           'lastcontact': JSON.stringify(lastcontact.value),
                           'angellist': JSON.stringify(angellist.value),
                           'linkedin': JSON.stringify(linkedin.value),
                           'company': JSON.stringify(company.value),
                           'email': JSON.stringify(email.value),

                           'createdAt': JSON.stringify(new Date()), 
                           'updatedAt': '' 
                         };
        }
        console.log(note);
      chrome.storage.local.set(note);
    });
    chrome.storage.local.set({saving: 'false'});
  }

  function displayStoredData(){
    chrome.storage.local.get(null, function(result){
      if(result[noteKey]){
        textarea.value = JSON.parse(result[noteKey]['body']);
        fullname.value = JSON.parse(result[noteKey]['fullname']);
        lastcontact.value = JSON.parse(result[noteKey]['lastcontact']);
        angellist.value = JSON.parse(result[noteKey]['angellist']);
        linkedin.value = JSON.parse(result[noteKey]['linkedin']);
        company.value = JSON.parse(result[noteKey]['company']);
        email.value = JSON.parse(result[noteKey]['email']);
      }
    });
  }

  var timeoutId;

  inputfield.addEventListener('keyup', function(){
    clearTimeout(timeoutId);

    if(textarea.value || fullname.value || lastcontact.value || angellist.value || linkedin.value || company.value || email.value) {
      indicator.style.background='#f5d44f';
    };

    timeoutId = setTimeout(function() {
      getNewIframeData();
    }, 500);
  });
});
