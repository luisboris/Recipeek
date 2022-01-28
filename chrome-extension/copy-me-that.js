var ext_number = "16"; // not used by bookmarklet

if(location.protocol=="https:"){
   var domain = "https://button.copymethat.com"; // domain only used by bookmarklet
} else{var domain = "http://button.copymethat.com";
}

try{
    var spinner_url = chrome.runtime.getURL("spinner_25.gif"); // chrome and firefox 
} catch(e){
    var spinner_url = "https://copymethat.blob.core.windows.net/static/spinner_25.gif"; // mac share/bookmarklet
}

var css = '.copy_me_that_outer div, .copy_me_that_outer span, .copy_me_that_outer a, .copy_me_that_outer a:visited, .copy_me_that_outer a:link, .copy_me_that_outer a:hover{background-image:none;background-color:white;border:none;box-shadow:none;box-sizing: content-box;clear:none;color:black;cursor:auto;direction:ltr;display:block;float:none;font-family:arial;font-size:15px;font-style:normal;font-variant: normal;font-weight: normal;letter-spacing: normal;line-height: normal;margin:0;max-width: none;opacity: 1;padding:0;position: relative;text-align: start;text-anchor: start;text-decoration: none;text-indent: 0px;text-overflow: clip;text-rendering: auto;text-shadow: none;text-transform: none;top: 0px;vertical-align: baseline;visibility: visible;white-space: normal;word-spacing: 0px;word-wrap: normal;}\
.copy_me_that_outer span, .copy_me_that_outer a, .copy_me_that_outer a:visited,  .copy_me_that_outer a:link, .copy_me_that_outer a:hover{display:inline;} \
#copy_me_that_container{width:169px;background:white;border:solid #9b2840 3px; \
box-shadow: 0 0 0 2px  white; position:fixed;z-index:3000000000;top:7px;right:7px;padding-bottom:0px;} #copy_me_that_spinner{background:white; background-image:url("'+spinner_url+'");height:25px;width:25px;margin-left:auto;margin-right:auto; margin-top:4px;display:block;/*preloaders.net/*/} #copy_me_that_title{background:#9b2840;border:solid white 1px;height:26px;color:white;font-size:18px;font-family:arial;text-align:center;line-height:26px;} #copy_me_that_msg{font-size:17px;padding-right:5px;padding-left:5px;text-align:center;font-family:arial;margin-top:10px;} #copy_me_that_recipe_link, #copy_me_that_home_link, #copy_me_that_orig_src_link, #copy_me_that_cookie_link{text-decoration:underline !important;color:#0000D4 !important;font-size:17px !important;text-align:center !important;font-family:arial !important; cursor:pointer !important;}  #copy_me_that_highlight{color:blue; font-size:17px;font-family:arial;font-weight:bold;} #copy_me_that_remove_x{float:right;width:50px;text-align:right;line-height:26px;height:26px;padding-right:10px;font-size:20px;cursor:pointer;color:#3a3a3a;}';

var html_container = '<div id = "copy_me_that_container" onclick="var e = arguments[0] || window.event;e.stopPropagation();"> <div id = "copy_me_that_title">Copy Me That</div> <div id = "copy_me_that_msg">&nbsp;</div><div id = "copy_me_that_remove_x">x</div></div>';

var html_dict = {
"error" :   ' We\'re sorry. <br/> An error occured.',
"waiting" : '<div id = "copy_me_that_spinner"></div>',
"selection_error" : 'You have highlighted too much text. Either highlight no text or highlight an <b>ingredient word </b>from the recipe that you want to copy.',
"no_connection" : 'It seems that you are not connected to the internet.<br/> Please connect and then try again. <br/> <br/>  <a href = "https://www.copymethat.com/button_connect_info/?c=1" id = "copy_me_that_recipe_link" target = "_blank">But I am connected!</a><br/><br/>',
"facebook_selection_error" :  'When copying from Facebook, please highlight an <b>ingredient word</b> from the recipe that you wish to copy,<br/> and then click <br/>the button.',
"reddit_selection_error" : 'When copying from reddit, please highlight an <b>ingredient word</b> from the recipe that you wish to copy,<br/> and then click <br/>the button.',
"facebook_weird_selection_error" : 'We are sorry, an error occurred. If you haven\'t already done so, please highlight an <b>ingredient word</b> from the recipe that you wish to copy. This is necessary when copying from Facebook.',
"reddit_weird_selection_error" : 'We are sorry, an error occurred. If you haven\'t already done so, please highlight an <b>ingredient word</b> from the recipe that you wish to copy. This is necessary when copying from reddit.',
"try_to_copy_button_page" : "The button is working! Now try it out on a webpage (from any website) with a recipe.", // only relevant for some
"fb_url_error" : "To copy this recipe, please click to view just the one post.",
// below are bookmarklet only
"wrong_chrome_use" :  'It seems that you have tried to copy your bookmarks instead of the recipe. You can read the <a href = "https://www.copymethat.com/info/button/" id = "copy_me_that_recipe_link">directions here</a>',
"fb_goto_single_post_and_continue" :  "For Facebook, please go to a single post and then try again.",
"reddit_tap_to_select_and_continue" :  'Now tap the recipe comment that you want to copy.',
"facebook_tap_to_select_and_continue" :  'Now tap the recipe post that you want to copy.',
"google_amp" :  'Please view this page in the </br> <a id = "copy_me_that_orig_src_link">original webpage</a> </br>and try again. </br></br> You are viewing this webpage from within google.com, which Copy Me That cannot access.'
}

function handle_img(element){
    var computedStyle =  window.getComputedStyle(element);
    var width = computedStyle.getPropertyValue("width").replace("px","");
    var height = computedStyle.getPropertyValue("height").replace("px","");
    var opacity = computedStyle.getPropertyValue("opacity");
    
    try{
        var natural_height = element.naturalHeight;
        var natural_width = element.naturalWidth;
    } catch(e){
        var natural_height = 0; // browser does not have naturalHeight. Will also be 0 if not loaded
        var natural_width = 0;
    }

    if (height >= 100 && width >= 100 && (natural_height == 0 || natural_height > 100) && (natural_width == 0 || natural_width > 100) &&  opacity != "0"){
       
        var rect = element.getBoundingClientRect();
        try{var img_position = Math.round(rect.top) +","+Math.round(rect.left);}
        catch(e){return -1;} // potential adblock issue

        l_type = 0;
        if (element.parentNode.hasAttribute("href") && element.parentNode.nodeName == "A" ){
            phref = element.parentNode.href.toLowerCase();
            if(phref.indexOf("http") == 0 && phref.indexOf(".jpg") == -1 && phref.indexOf(".jpeg") == -1 && phref.indexOf(".gif") == -1 && phref.indexOf(".png") == -1 && phref.indexOf(".tif") == -1 && phref.indexOf("pinterest") == -1 && phref.indexOf("smugmug") == -1 && phref.indexOf("picasa") == -1 && phref.indexOf("flickr") == -1 && phref.indexOf("video") == -1 && element.src != phref ){
                if ( element.parentNode.hostname != url_hostname){l_type = 1;}
                else if (phref == url){l_type = 3;}            
                else {l_type = 2;}
            } 
        } 
        else if (element.parentNode.parentNode.hasAttribute("href") && element.parentNode.parentNode.nodeName == "A" ){
            phref = element.parentNode.parentNode.href.toLowerCase();
             if(phref.indexOf("http") == 0 && phref.indexOf(".jpg") == -1 && phref.indexOf(".jpeg") == -1 && phref.indexOf(".gif") == -1 && phref.indexOf(".png") == -1 && phref.indexOf(".tif") == -1 && phref.indexOf("pinterest") == -1 && phref.indexOf("smugmug") == -1 && phref.indexOf("picasa") == -1 && phref.indexOf("flickr") == -1 && phref.indexOf("video") == -1 && element.src != phref ){
                if ( element.parentNode.parentNode.hostname != url_hostname){ l_type = 1;} 
                else if (phref == url){l_type = 3;}   
                else{l_type = 2;}
            }
        }
        
        var src = element.src;
        
        if( window.HTMLPictureElement && element.complete){
            try{
                src = element.currentSrc; // picture elements. But don't wait if not loaded
            } catch(e){
            }
        } 
        if (src == ""){
           try{
                 srcset = element.srcset;
                 if (srcset.indexOf(",") == -1){ 
                    e = srcset.length;
                 }else{ 
                    e = srcset.indexOf(",");
                }
                src = srcset.slice(0, e);
            } catch(err){ // was causing errors in ie
            }
        } 
        
        if (src.indexOf("http") == 0){
            img_list.push({"src":src,"h":Math.round(height),"w":Math.round(width),"p":img_position,"l":l_type});
            return img_list.length -1
        } else{return -1;}
    }
    return -1;
}

function handle_img_as_background(element, computedStyle, is_m_fb){
    var b_img = element.style.backgroundImage; // want inline only
    
    if (b_img == "" ){return; }
    
    var width = computedStyle.getPropertyValue("width").replace("px","");
    var height = computedStyle.getPropertyValue("height").replace("px","");
    if ( ( ! is_m_fb && height >= 100 && width >= 100)
        ||  (is_m_fb && (height >= 120 || height == 0) && width >= 120) // fb m image says 0 width, but isn't
        )
    { var rect = element.getBoundingClientRect();
        try{img_position = Math.round(rect.top) +","+Math.round(rect.left);}
        catch(e){return;} // potential adblock issue        
        s = b_img.indexOf("url");
        src = b_img.slice(s+4, b_img.slice(s).indexOf(")")+s).replace(/"/g, ''); //ff includes the parentheses
        if (src.indexOf("http") == 0){
            img_list.push({"src":src,"h":Math.round(height),"w":Math.round(width),"p":img_position, "b":1});
        }
    }
}

function getAttributes(element){
var attributes = {};
for (var i = 0; i < element.attributes.length; i++) {
  var attrib = element.attributes[i];
  if (attrib.specified == true) {
    if (attrib.name == "class"){
        if (attrib.value == "quantity"){
             attributes[attrib.name] = attrib.value;
        } 
        else if(attrib.value.indexOf("promotionDiv") != -1 || attrib.value.indexOf("swoop-container") != -1){
            attributes[attrib.name] = "promo";
        } 
    }
    else if (attrib.name =="href"){
        if ( attrib.value.charAt(0) == "/" ||  attrib.value.charAt(0) == "h" ){
            attributes[attrib.name] = "x";
        }
    }
    if (attrib.name == "src" && element.nodeName == "IFRAME" ){
        attributes[attrib.name] = element.src.substring(0,35);
    }
  }
} 
return attributes;
}

function getStyles(element){ // also handles image as background
    var styles = [];  
    var computedStyle =  window.getComputedStyle(element);
    var style_list = [["text-align","start"], ["font-size","0px"], 
                   ["width","auto"], ["height","auto"], ["display","block"],["list-style-type","none"], ["float","none"], ["color", "rgb(0, 0, 0)"], ["overflow-x","visible"],["overflow-y","visible"],["font-weight","normal"], ["font-style","normal"], ["position","static"], ["text-transform","none"],
                   ["margin-top","0px"],["margin-right","0px"],["margin-bottom","0px"],["margin-left","0px"],
                   ["padding-top","0px"],["padding-right","0px"],["padding-bottom","0px"],["padding-left","0px"], 
                   ["clear","none"],["text-decoration","none"], ["background-color","rgba(0, 0, 0, 0)"], 
                   ["border-bottom-style","none"], ["border-top-style","none"], ["border-left-style","none"], ["border-right-style","none"]
                   ,["white-space","normal"], ["text-indent", "0px"]
                   ]; 
    if(computedStyle.getPropertyValue("background-image") != "none"  ){
        handle_img_as_background(element, computedStyle, false);
    }
    var c_key;
    var c_style;
    var x;
    for(var i=0; i<style_list.length; i++){
          c_key = style_list[i][0];
          c_style = computedStyle.getPropertyValue(style_list[i][0]);
          
          if (element.nodeName == "HTML" && c_key == "height"){ // set html height to document height
            var body = document.body, html = document.documentElement;
            x = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
            c_style = x.toString();
          }
          if (element.nodeName == "HTML" && c_key == "width"){ // set html width to document width
            var body = document.body, html = document.documentElement;
            x = Math.max( body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth );
            c_style = x.toString();
          }
          if(c_key == "overflow-y" && c_style == "hidden" && (element.className.indexOf("jspContainer") != -1 )){
              c_style = "jspscrollable";
          }
          if((c_key == "height" || c_key == "width") && c_style == "auto"){
               try{
                    var rect = element.getBoundingClientRect();
                    padding_top = computedStyle.getPropertyValue("padding-top");
                    padding_bottom = computedStyle.getPropertyValue("padding-bottom");
                    x = Math.round(rect.bottom) - Math.round(rect.top) - parseFloat(padding_top.replace("px", "")) - parseFloat(padding_bottom.replace("px", ""));
                    c_style = x.toString();
                  }catch(e){}
          }

           if(c_key == "text-decoration" && c_style != style_list[i][1]){ // because sometimes will be like "none solid red"
                if(c_style.indexOf("none") != -1){styles.push(0);}
                else{styles.push(c_style);}
           }
          else if (c_style != style_list[i][1]  && (c_style != "transparent" || c_key != "background-color")  ){ // chrome has different default than ie/firefox
                  c_style = c_style.replace("px", "");
                  if(! isNaN(c_style)){
                    c_style = parseInt(c_style);
                  }
                  styles.push(c_style);
               }
               else{
                  styles.push(0);
               }
     }

     if (element.nodeName == "LI"){
        if (computedStyle.getPropertyValue("list-style-image") != "none"){
            styles.push("true");
        } else{styles.push(0);}
        if (computedStyle.getPropertyValue("background-image") != "none" && computedStyle.getPropertyValue("background-repeat") == "no-repeat" ){
            styles.push("true");
        }else{styles.push(0);}
     }
     else{styles.push(0);styles.push(0);}

    var split_i = styles.length;
    for (var i = styles.length-1; i >= 0; i--) {
        if (styles[i] == 0) {split_i = i}    
         else{break;}
     }
    
    styles = styles.splice(0,split_i);
    return styles;
}

var hid_comments = false;
var comments_ele;
function hide_known_comments(){
     // also hides carousel case
    var comments_found = false;
    var found_comments_ele = document.getElementsByClassName("commentlist");
    if (found_comments_ele.length>0){
        found_comments_ele = found_comments_ele[0];
        comments_found = true;
    } else{
        var found_comments_ele = document.getElementsByClassName("comment-list");
        if (found_comments_ele.length>0){
            found_comments_ele = found_comments_ele[0];
            comments_found = true;
        } else{
            var found_comments_ele = document.getElementById("comments");
            if (found_comments_ele){
                comments_found = true;
            } else{
                var found_comments_ele = document.getElementById("CurrentComments");
                if (found_comments_ele ){
                    comments_found = true;
                } else {
                    var found_comments_ele = document.getElementsByClassName("slick-track");
                    // not comments, but carousel of images. Ok if is image(s) for recipe, but can be 100s of other recipes
                    if  (found_comments_ele.length>0 || found_comments_ele.offsetWidth > 800){
                        found_comments_ele = found_comments_ele[0];
                        comments_found = true;
                    }
                }
            }
       }
    }
    if ( comments_found ){
        comments_ele = found_comments_ele;
        comments_ele.style.display='none';
        hid_comments = true;                    
    }  
}

function reshow_known_comments(){
    if ( hid_comments){
        comments_ele.style.display='block';
    }                
}            

function get_meta_image(){
   var metas = document.getElementsByTagName('meta'); 
   for (var i=0; i<metas.length; i++) { 
      if (metas[i].getAttribute("property") == "og:image" || metas[i].getAttribute("itemprop") == "image") { 
         src = metas[i].getAttribute("content");
         img_list.push({"src":src,"m":"1"});
         break;
      } 
   }  
}

var changed_tab;
var changed_tab_orig_display;
var changed_tab_orig_opacity;

function rehide_hidden_tab(){
    if (changed_tab != null){
        changed_tab.style.display = changed_tab_orig_display;
        changed_tab.style.opacity = changed_tab_orig_opacity;
    }
}

function unhide_hidden_tab(){
    function do_unhide_hidden_tab(tab_list){
        var tab;
        for (var i = 0; i < tab_list.length; i++) {
            tab = tab_list[i];
            if (tab != null && window.getComputedStyle(tab).getPropertyValue("display") == "none"){
                changed_tab_orig_display = tab.style.display;
                changed_tab_orig_opacity = tab.style.opacity;
                changed_tab = tab;
                tab.style.setProperty ("display", "block", "important");
                tab.style.opacity = "1";
                return;
            } 
        }
    }
    function nl_to_a(nl){
        var arr = [];
        for(var i = nl.length; i--; arr.unshift(nl[i]));
        return arr;
    }
    var url_str = url.toString();
    if (url_str.indexOf("www.jamieoliver.com") != -1){
        do_unhide_hidden_tab( nl_to_a(document.getElementsByClassName("recipe-instructions")) );
    } else if (url_str.indexOf("www.canadianliving.com") != -1){
        do_unhide_hidden_tab(nl_to_a(document.getElementsByClassName("method")).concat(nl_to_a(document.getElementsByClassName("ingredients"))) );
    } else if (url_str.indexOf("donnahay.com.au") != -1 || url_str.indexOf("www.taste.com.au") != -1){
        do_unhide_hidden_tab( nl_to_a(document.getElementsByClassName("tab-pane")) );
    } else if (url_str.indexOf("foodnetwork.co.uk") != -1){
        do_unhide_hidden_tab( nl_to_a(document.getElementsByClassName("recipe-tab")) );
    }  else if (url_str.indexOf("www.ricardocuisine.com") != -1){
        do_unhide_hidden_tab( [ document.getElementById("ingredients"), document.getElementById("preparation")] );
    }  else if (url_str.indexOf("10play.com.au") != -1 || url_str.indexOf("jamesmartinchef.co.uk") != -1){
        do_unhide_hidden_tab( nl_to_a(document.getElementsByClassName("tab-content")) );
    } else if (url_str.indexOf("recipes.sainsburys.co.uk") != -1){
        do_unhide_hidden_tab( nl_to_a(document.getElementsByClassName("recipe-tab-section")) );
    } else if (url_str.indexOf("myfoodbook.com.au") != -1){
        do_unhide_hidden_tab( nl_to_a(document.getElementsByClassName("view-id-recipes_single")) );
    } else if (url_str.indexOf("www.chefclub.tv") != -1){
        do_unhide_hidden_tab( nl_to_a(document.getElementsByClassName("tabItem--286d719")) );
    }
}

function getPage(element,p_count_siblings, selected_element, prev_sib_display){ 
    var display = "";
    var tag_dict = {};
    var is_selected = 0;
    if (element.nodeName == "#comment" || element.nodeName == "NOSCRIPT" || element.nodeName == "svg") {
        return [tag_dict, prev_sib_display];
    } 
    if(prev_sib_display == "block" &&  element.nodeName == "#text"  && element.nodeValue.replace(/\u00a0/g, "x").trim().length == 0 ) {
            return [tag_dict, "block"]; // prevent extra blank text nodes   
    } 
    if (element.nodeName != "#text") {
        display = window.getComputedStyle(element).getPropertyValue("display"); 
        visibility = window.getComputedStyle(element).getPropertyValue("visibility"); 
    } 
    // if element is displayed, get information
    if (display != "none") { 
        var nodeValue = "";
        var img_index = -1;
        
        if (element.nodeName == "#text" && selected_element != null && element == selected_element){
              // Check if the user selected this element   
              is_selected = 1;
              tag_dict["selected"] = 1;
        }
        
        if (element.nodeName == "#text" && p_count_siblings == 1){
                // Put single sib text directly inside the parent. 
                tag_dict["single_text"] = 1;
                tag_dict["text"] = element.nodeValue;
        }
        else{
            
            tag_dict["tag"] = element.nodeName;
                           
            if (element.nodeName == "IMG" ) {   
                img_index = handle_img(element);
                if (img_index != -1) {
                        tag_dict["ii"] = img_index;
                }
                tag_dict["s"] = getStyles(element); // ?
                tag_dict["a"] = getAttributes(element); // ?
            } 
            else if (element.nodeName == "#text") {
                // Add parent span to get position // solution using range.selectNodeContents(element) broke in iOS 11.
                if (element.nodeValue.replace("\r","").replace("\n","").replace("\t","").length != 0){
                     var wrapper = document.createElement('span');
                     element.parentNode.insertBefore(wrapper, element);
                     wrapper.appendChild(element);
                     var rect = wrapper.getBoundingClientRect();
                     var position = Math.round(rect.top) +","+Math.round(rect.left);
                     wrapper.parentNode.replaceChild(element, wrapper);
                     tag_dict["p"]  = position;
                     tag_dict["text"]  = element.nodeValue;
                } else{
                    
                }
            }
            else{ // not image or text
                tag_dict["s"] = getStyles(element);
                tag_dict["a"] = getAttributes(element);
                var rect = element.getBoundingClientRect();
                var position = Math.round(rect.top) +","+Math.round(rect.left);
                tag_dict["p"]  = position;
                if(element.nodeName == "INPUT" && (element.type.toLowerCase() == "text" || element.type.toLowerCase() == "number")){
                   tag_dict["text"]  = element.value;
                }        
            } 
        }

       //Only want children, including text, if not hidden. We do want hidden element itself, though, because styles can be relevant (eg clear:both) or can cause newline
        if (visibility != "hidden" && element.nodeName != "IFRAME") { // will we miss out on same-src iframes?
            var kids = element.childNodes;
            var count_children = kids.length;
            var s_display = prev_sib_display;
            tag_dict["c"] = [];
            for(var i=0; i<kids.length; i++){
                dict_display = getPage(kids[i], count_children, selected_element, s_display);
                if (Object.keys(dict_display[0]).length !== 0){
                    if ("single_text" in dict_display[0]){
                            tag_dict["text"] =  dict_display[0]["text"];
                            tag_dict["selected"] =  dict_display[0]["selected"];
                    }
                    else{
                        tag_dict["c"].push(dict_display[0]);
                        s_display = dict_display[1];
                    }
                }
            }
        }
    }
    
    var s_display = display; 
    if (element.nodeName == "#text") { var s_display = "block"; } // prevent > 1 in a row due to display:none siblings.
    else if ( display == "none") {s_display = prev_sib_display ;}

    return [tag_dict,s_display];
}
     
function get_page_hostname(){
    var a = document.createElement('a');
   a.href = window.location;
  return a.hostname;
}

function get_urls(firstEle){
    var pp_url = "";
    var url;
    if( url_hostname.indexOf("reddit.com") != -1){
        url = get_reddit_permalink(firstEle);
    } else if( url_hostname.indexOf("facebook.com") != -1){
        url = get_facebook_permalink(firstEle);
    } else if( url_hostname.indexOf("pepperplate.com") != -1){
        try{
            url = document.getElementById("cphMiddle_cphMain_hlSource").href;
            pp_url = String(window.location);
        } catch(e){
                try{
                url = document.getElementById("cphMiddle_cphSidebar_hlOriginalRecipe").href;
                pp_url = String(window.location);
            } catch(e){
                url =  String(window.location);
            }
        }
    } 
    else{
        url =  String(window.location);
    }
    return [url, pp_url];
}
     
function getCountSelectedNodes() {
    var count = 0;
    
    function countTextNodes(element){
        var kids = element.childNodes;
        for(var i=0; i<kids.length; i++){
            countTextNodes(kids[i]);
        }
        if (element.nodeName == "#text" && element.nodeValue.trim() != "")
             {count += 1;}
        return count;
    }  

    var html = "";
    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var container = document.createElement("div");
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }
        }
    }
    return countTextNodes(container);
}

function get_facebook_permalink(firstEle){
     var urlregexp = new RegExp("^https://(www|m).facebook.com.*(permalink|/photos/|/notes/|/posts/[0-9]+|/videos/|/(story|photo).php)|/learning_content/[?]filter");
    function loop(ele){
		var kids = ele.childNodes;
        var e, h;
		for(var i=0; i<kids.length; i++){
			e = kids[i];
			if (e.nodeName == "A" && e.hasAttribute("href") ){
                href = e.href;
                if ( urlregexp.test(href) ){
                    return href;
                }
            } else{
                if (e.nodeName == "A" && e.hasAttribute("href") ){
                    
                }
            }
            h = loop(e);
            if (h != ""){return h;}
	    }
        return "";
	}

    if (firstEle.nodeName == "HTML" || is_single_post_fb_url()){
        // always here for touch since must be single post to get here
        return String(window.location);
    } else{
        h = loop(firstEle);
        if (h != "" ){
            return h;
        }else{
            throw new CmtStopError("fb_url_error");
        }
    }
}

function get_reddit_permalink(firstEle){
    function loop(ele){
        var kids = ele.childNodes;
        var e,x,y;
        for(var i=0; i<kids.length; i++){
            e = kids[i];
            class_name = e.className;
            if (  typeof class_name != "undefined" && class_name.indexOf("bylink") != -1 
                  && typeof e.href != "undefined" && e.href.indexOf("reddit.com") != -1){
                return e.href;
            }
            x = loop(e);
            if ( typeof x != "undefined" ){
                return x;
            } 
      }
    }
    if (String(firstEle.nodeName) == "HTML"){
        return String(window.location);
    }   
    var firstEle_class = String(firstEle.className).toLowerCase();
    if(firstEle_class.indexOf("comment__body") != -1){
        // small comment
        var comment_id = firstEle.parentNode.parentNode.getElementsByClassName('Comment__header')[0].id;
        var window_url = window.location.href;
        var url_patt = new RegExp('.*/comments/[^/]*/');
        var match_length = window_url.match(url_patt)[0].length;
        var url_start = window_url.substring(0, match_length);
        permalink = url_start + "comment/" + comment_id + "/";
        return permalink;
    } 
    else if(firstEle_class.indexOf("postcontent__selftext") != -1){
        // small post
        return String(window.location);
    }
    else if(firstEle_class.indexOf("entry") != -1){
        y = loop(firstEle);
        if (typeof y != "undefined"){
            // notsmall, old view, comment
            return y;
        }
        else{
            // notsmall, old view, post
            return String(window.location);
        }
    }
    // notsmall, new view
    function loop2(ele){
        var kids = ele.childNodes;
        for(var i=0; i<kids.length; i++){
            e = kids[i];
            if (typeof e.href != "undefined" && e.href.indexOf("/comments/") != -1){
                return e.href;
            }
            x = loop2(e);
            if ( typeof x != "undefined" ){
                return x;
            } 
      }
    }
    var parent = firstEle.parentElement.parentElement;
    y = loop2(parent);
    if (typeof y != "undefined"){
        // notsmall, new view, comment
        return y;
    }
    else{
        // notsmall, new view, post
        return String(window.location);
    }
}

function get_reddit_entry_unit(selected_element){
    var ele = selected_element;
    while (true) {
        var ele_class = String(ele.className).toLowerCase();
         if ( typeof ele_class != "undefined" && (ele_class.indexOf("entry") != -1 || ele_class.indexOf("comment__body") != -1 || ele_class.indexOf("postcontent__selftext") != -1 )){
            // entry: notsmall, old view, comment and post
            // comment__body: small, old/new view, comment
            // postcontent__selftext: small, old/new view, post
            return ele; 
        }
        else{
            ele = ele.parentNode;
            if (ele.nodeName == "HTML"){
                break;
            }  
        }
    }
    // didn't find old or small entry unit
    ele = selected_element;
    while (true) {
        var node_name = String(ele.nodeName).toLowerCase();
        if (node_name == "div"){
            return ele;
        }
        else {
            ele = ele.parentNode;
            if (node_name == "html"){
                return null;
            }    
        }
    }
}

function get_facebook_timeline_unit(selected_element){ 
    var ele = selected_element;
    var url_str = String(window.location);
    if (ele.nodeName == "#text"){
        ele = ele.parentNode;
    }
    while (true) {
        var ele_role = ele.getAttribute("role");
        var ele_aria_label = ele.getAttribute("aria-label");
        if ( (ele_role == "article" && ele_aria_label != "comment") ||  ele_role == "dialog" || ele_role == "group"){ 
              // dialog is file
              // group is photo (?)
              // article is not-small post and not-small post comment
            return ele;
        } else if (ele_role == "complementary" && url_hostname.indexOf("/photos/") != -1){
            return ele.parentNode;
        } else if (ele_role == "main" && url_str.indexOf("/notes/") != -1){ 
            return ele;
        } else{
            ele = ele.parentNode;
            if (ele.nodeName == "HTML"){
               break;
            } 
        }
    }
    
    // only here if didn't find ele
    
   if ( url_hostname.indexOf("m.facebook.com") != -1 ){ 
        var classesArray = ["fbxPhoto","userContentWrapper","fbPhotoAlbumHeader","webMessengerMessageGroup"];
    }  
    else{
        var classesArray = ["fbUserStory","fbuserpost", "fbusercontent", "fbtimelineunit","fbPhotoSnowliftContainer", "fbxPhoto", "uiunifiedstory","webmessengermessagegroup","fbphotocaption fbphotoalbumheadertext", "usercontentwrapper", "_4-u3 _5cla","_4lmi"]; // _4lmi is file
    }
    
    function ele_has_post_class(ele_class_lower){
        var arrayLength = classesArray.length;
        for (var i = 0; i < arrayLength; i++) {
            if(ele_class_lower.indexOf(classesArray[i].toLowerCase()) != -1){
                return true;
            }
        }
        return false;
    }
   
    while (true) {
        var ele_class_lower = String(ele.className).toLowerCase();
        if ( typeof ele_class_lower != "undefined" && ele_has_post_class(ele_class_lower)){
            if (ele_class_lower.indexOf("userContentWrapper".toLowerCase()) != -1){
                ele_gp = ele.parentNode.parentNode;
                if (ele_gp.getAttribute("role") == "article"){
                    return ele_gp;
                }
                ele_ggp = ele_gp.parentNode;
                if (ele_ggp.getAttribute("role") == "article" ){
                    return ele_ggp;
                }
            } 
            return ele; 
        }
        else{
            ele = ele.parentNode;
            if (ele.nodeName == "HTML"){
                return null;
            }  
        }
    } 
}

function get_thumbnail_link_if_reddit(){
    var thumbnail_link = "";

    if ( url_hostname.indexOf("reddit.com") != -1 ){
        try{ 
              var thumbnail_link = document.getElementsByClassName('preview')[0].src;
        } catch(e){}
        if ( thumbnail_link == ""){
            try{ 
                 var thumb_ele = document.getElementsByClassName('thumbnail')[0];
                 if (thumb_ele){  
                    var kids = thumb_ele.childNodes;
                    for(var i=0; i<kids.length; i++){
                        if (kids[i].nodeName == "IMG"){
                            thumbnail_link = kids[i].src;
                            break;
                        } 
                    }
                 }
            } catch(e){}
        }
        if ( thumbnail_link == ""){
            try{ 
                  var preview_img =  document.getElementsByClassName('PostContent__image-link')[0];
                  if (preview_img.href.indexOf("out.reddit.com")){
                      var b_img = preview_img.style.backgroundImage;
                      var s = b_img.indexOf("url");
                      thumbnail_link = b_img.slice(s+4, b_img.slice(s).indexOf(")")+s).replace(/"/g, '');
                  } else{
                     thumbnail_link = preview_img.href;
                  }
            } catch(e){thumbnail_link = "";}

        }
    }
   
    
    if(thumbnail_link === null){
        thumbnail_link = "";
    }
    return thumbnail_link;
}

function get_user_selected_ele(){
    // returns ele selected by user. Is null if nothing selected. Stops execution and displays msg if too much selected
    var userSelection = window.getSelection();
    var startNode = userSelection.anchorNode;
    var endNode = userSelection.focusNode; 
    var user_selected_too_much = false;
    
    if (("" + userSelection).length > 0){
        var has_selection = true;
    }else{
        var has_selection = false;
    }

    if (has_selection){
         if (startNode.compareDocumentPosition(endNode) == 4){ 
          var selected_element = startNode;
         }else{ var selected_element = endNode;}

         if (getCountSelectedNodes()  > 1){
            user_selected_too_much = true;
         }
    }else{
        selected_element = null;
    }
    if (user_selected_too_much){
        throw new CmtStopError("selection_error");
    }
        
    return selected_element;
}

function is_single_post_fb_url(){
    if(document.URL.indexOf("story.php") != -1 || document.URL.indexOf("/posts/") != -1 || document.URL.indexOf("/photos/") != -1 || document.URL.indexOf("photo.php") != -1  || document.URL.indexOf("/notes/") != -1 || document.URL.indexOf("/permalink/") != -1 || document.URL.indexOf("view=permalink") != -1  
    ){
        return true;
    } else{
        return false;
    }
}

function convert_problem_chars(dict){ // not used for bookmarklet
    // & and ; caused post value to be truncated, at least in iOS ext
    // also gives "" default for blanks
    for (var key in dict) {
        var value = dict[key];
        if (typeof value != "undefined" ){
            value = value.replace(new RegExp("&", 'g'), "xampersandx");
            value = value.replace(new RegExp(";", 'g'), "xsemicolonx");
            dict[key] = value;
        } else{
            dict[key] = ""; // happens with cmt recipe page
        }
    }
    return dict; // server-side will convert these back
}

function handle_google_amp(){
    // not called fo all buttons. Should it be?
    var url =  String(window.location);
    var google_amp_pattern = new RegExp("https://www[.]google[.][^/]*/amp/");
    var google_amp_pattern_s = new RegExp("https://www[.]google[.][^/]*/amp/s/");
    var res_s = google_amp_pattern_s.exec(url);
    var res = google_amp_pattern.exec(url);
    var is_amp = false;
    if (res_s){
        var actual_webpage =  "https://" + url.substring(res_s[0].length);
        var is_amp = true;
    } else if (res){
         var actual_webpage =  "http://" + url.substring(res[0].length);
         var is_amp = true;
    }        
    if (is_amp){
        actual_webpage = actual_webpage.replace("%3F","?").replace("%3f","?").replace("%3D","=").replace("%3d","=");
        throw new CmtStopError("google_amp_"+actual_webpage);
    }   
}

function handle_info_page(){ // not used for app browser
    if (String(window.location).indexOf("copymethat.com/info/button/") != -1){
        throw new CmtStopError("try_to_copy_button_page");
    }
}

function CmtStopError(message){
    this.message = message;
}
CmtStopError.prototype = new Error();

function show_initial_msg(){
    // insert css
    var head = document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet){ style.styleSheet.cssText = css;} 
    else { style.appendChild(document.createTextNode(css));}
    head.appendChild(style);

    try{
        var el = document.getElementById("copy_me_that_outer");
        el.parentNode.removeChild(el); // in case already copied once
    }catch(e){}

    var node=document.createElement("DIV");
    node.id = "copy_me_that_outer";
    node.className = "copy_me_that_outer";
    node.innerHTML = html_container;
    document.getElementsByTagName("body")[0].appendChild(node); 
    document.getElementById('copy_me_that_msg').innerHTML = html_dict["waiting"];

    document.getElementById('copy_me_that_remove_x').onclick = function(){this.parentNode.parentNode.style.display = "none"; };
}

function get_firstEle(){
    function get_is_fb(){
        if (url_hostname.indexOf("www.facebook.com") != -1 
           || url_hostname.indexOf("m.facebook.com") != -1 ){
            return true;   
        } else{
            return false;
        }
    }

    if (get_is_fb()){
        if (! is_touch ){
            if (selected_element == null){
                throw new CmtStopError("facebook_selection_error");
            } else{
                firstEle = get_facebook_timeline_unit(selected_element);
                if (firstEle == null){
                    throw new CmtStopError("facebook_weird_selection_error");
                }
            }
        }
        else {
            if( url_hostname.indexOf("m.facebook.com") != -1 ){
                if (! is_single_post_fb_url()){
                    throw new CmtStopError("fb_goto_single_post_and_continue");
                } else{
                    var firstEle = document.getElementsByTagName("html")[0];
                } 
            } else if ( is_single_post_fb_url() ){
                var firstEle = document.getElementsByTagName("html")[0];
            } // touch-non_single-www case is handled elsewhere
        }        
    }
    // reddit touch case is handled elsewhere
    else if( url_hostname.indexOf("reddit.com") != -1 ){
        if (selected_element == null){
            throw new CmtStopError("reddit_selection_error");
        }
        else{
            var firstEle = get_reddit_entry_unit(selected_element);            
            if (firstEle == null){
                throw new CmtStopError("reddit_weird_selection_error");
            }
        }
    }
    
    else if( url_hostname.indexOf("docs.google.com") != -1 ){
         var firstEle =  document.getElementById("docs-editor");           
         if (firstEle == null){
            var firstEle = document.getElementsByTagName("html")[0];;
        }
    }
    
    else{
            var found_wp_ele = document.getElementsByClassName("wprm-recipe-container");
            if (found_wp_ele.length>0){
                is_using_wp=true;
                // have seen cases with more than one ele with this class so use the longest
                var longest_i = 0;
                var longest_size= 0;
                for(i=0;i<found_wp_ele.length;i+=1){
                     var length = found_wp_ele[i].innerHTML.length;
                     var wp_ele_display = window.getComputedStyle(found_wp_ele[i]).getPropertyValue("display");
                     if (length > longest_size && wp_ele_display != "none"){
                         longest_i = i;
                         longest_size = length;
                     }                             
                }
                var firstEle = found_wp_ele[longest_i];
            } else{
                var firstEle = document.getElementsByTagName("html")[0];
            }
    }
    
    return firstEle;
}

function handle_cmt_stop_error(err_msg){
    display_pre_response(err_msg);
}

// ---------------------- above is same for bookmarklet and Chrome/FF (more below for others)

function display_server_response(response_data){
    document.getElementById('copy_me_that_outer').style.display = "block";
    if (response_data == ""){
        document.getElementById('copy_me_that_msg').innerHTML = html_dict["no_connection"];
    }
    else{
       document.getElementById('copy_me_that_msg').innerHTML = response_data;
    }

    chrome.runtime.sendMessage({}, function(response) {}); 
    window.copy_me_that_in_progress = 0;
    window.copy_me_that_in_progress2 = 0;    
}
     
function display_pre_response(response_data){ // msg before any calls

    document.getElementById('copy_me_that_outer').style.display = "block";
    
    var innerHTML = html_dict[response_data];
    
    document.getElementById('copy_me_that_msg').innerHTML = innerHTML;

    chrome.runtime.sendMessage({}, function(response) {}); 
    
    window.copy_me_that_in_progress = 0;  
    window.copy_me_that_in_progress2 = 0;   
}

// **************** Actual execution starts here  ************************
var cmt_recipe_pattern = new RegExp('^https?://www.copymethat.com/r/');
var is_touch = false;

if (! window.copy_me_that_in_progress || window.copy_me_that_in_progress != 1){
    
    window.copy_me_that_in_progress = 1;
    
    var img_list = [];
    var pageHTML;
    var title;
    var url_hostname;
    var url;
    var pp_url;
    var is_using_wp = false;
    var reddit_tn_link = "";
   
    show_initial_msg();
}

setTimeout(function(){ // makes corner message appear a bit faster 

try{

if (! window.copy_me_that_in_progress2 || window.copy_me_that_in_progress2 != 1){
    
    window.copy_me_that_in_progress2 = 1;

    if ( ! cmt_recipe_pattern.test( String(window.location)) ){
        
         url_hostname = get_page_hostname();
    
        // throws CmtStopError if try to copy button info page
        handle_info_page();
        
        // null if nothing selected. Throws CmtStopError and displays msg if too much selected
        selected_element = get_user_selected_ele(); 
        
        var firstEle = get_firstEle();

        try {title = document.title; }
        catch(err){title = ""}
        
        var urls = get_urls(firstEle);
        url = urls[0];
        pp_url = urls[1];
    
        unhide_hidden_tab();
        hide_known_comments();
        get_meta_image() // inserts into img_list
        reddit_tn_link = get_thumbnail_link_if_reddit();
        
        pageHTML = getPage(firstEle, firstEle.childNodes.length, selected_element, "block")[0]; // this also inserts into img_list
        
         if (is_using_wp){ // still want all images from page
                [].forEach.call(document.getElementsByTagName('img'), function(img){handle_img(img);}); 
         }
            
        if(url_hostname.indexOf("m.facebook.com") != -1){ // m.facebook has img as background, so must add separately
             [].forEach.call(firstEle.getElementsByClassName('img'), function(img){
                var computedStyle =  window.getComputedStyle(img);
                handle_img_as_background(img, computedStyle, true);
             }); 
        }
        
        rehide_hidden_tab();
        reshow_known_comments();
        
    } else{
        url = String(window.location);
        pageHTML = "";
    }
    
    // port to talk to background.js
    var port = chrome.runtime.connect();
    port.onMessage.addListener(function(message,sender){
      if(message.msgtype === "button_resp"){
        display_server_response(message.button_resp)
      } 
    });
    
    // create return dict
    tree = JSON.stringify(pageHTML);
    ua = navigator.userAgent;
    images = JSON.stringify(img_list);
     if (is_using_wp){
        is_wp = "1";
    } else{
        is_wp = "0";
    }
        
    //  all variables must be passed as strings to native
    var return_dict = {"ext_number":ext_number,"url":url,"title":title,"tree":tree,"images":images,"reddit_tn_link":reddit_tn_link,"pp_url":pp_url,"ua":ua,"wp":is_wp};

    if (chrome.extension.inIncognitoContext){
        return_dict["is_incognito"] = "1";
    } 

    return_dict =  convert_problem_chars(return_dict);
    
    // Send page info to background page. Gets msg back using port above
    port.postMessage({msgtype: "form",return_dict:return_dict});
}

} catch(err){
    if (err instanceof CmtStopError){
       handle_cmt_stop_error(err.message);
    }else{
       handle_cmt_stop_error("error");
    }
}   

}, 30); 


