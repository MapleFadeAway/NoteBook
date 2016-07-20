//处理cookie
//alert(window.location.pathname);
//系统关键search
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
var csrftoken = getCookie('csrftoken');
//处理cookie
//初始化显示内容
$(document).ready(function() {
    checkloginstate();
    checkeurl();
});
//检查登录状态
function checkloginstate() {
    $.ajax({
        beforeSend: function(request) {
            request.setRequestHeader('X-CSRFToken', csrftoken);
        },
        type: 'POST',
        url: '/chkls/',
        data: {
            "name": getCookie("name"),
        },
        dataType: 'json',
        success: function(data) {
            //setCookie("login", data.loginstate);
            if (data.loginstate == 1) {
                afterlogin(data);
            } else { //未登录即注销当前用户信息
                $("#navbar-userinfo").hide();
                $("#open-login").show();
                setCookie("name", "", 0);
                setCookie("login", 0);
                $("#header-search-buttom").hide();
                $("#header-search").hide();
            }

        }
    });
}
//登录成功时的动作
function afterlogin(data) {
    setCookie("name", data.name);
    setCookie("login", 1);
    $("#open-login").hide();
    $("#header-search-buttom").show();
    $("#header-search").show();
    document.getElementById("navbar-userinfo").innerHTML = data.name + '<span class="caret"></span>';
    document.getElementById("menu-user").innerHTML = '<li><a href="/list/' + data.name + '/">我的文章</a></li>\
                                                            <li class="dropdown-header"></li>\
                                                            <li><a id="open-logout" href="/">登出</a></li>';
}

//检查链接
function checkeurl() {
    var path = window.location.pathname;
    var matchpath = /^\/([\S\s]+?)\/$/g; //^\/([\S|\s]+?)\/$
    var matchuserpath = /^\/([\S\s]+?)\/([\S\s]+?)\/$/g; //^\/用户名\/文章名\/$
    var matchpathlogin = /^\/login\/([\S]{0,})$/g; //匹配login/...
    var matchpathlogout = /^\/logout\/([\S]{0,})$/g; //匹配logout/...
    var matchpathedit = /^\/e(dit)?\/([\S]{0,})$/g; //匹配edit/...
    var matchpathregister = /^\/register\/([\S]{0,})$/g; //匹配register/...
    var matchpathlist = /^\/l(ist)?\/([\S]{0,})$/g; //匹配list/...
    if (matchpathlogin.test(path)) {

} else if (matchpathlogout.test(path)) {
        //
    } else if (matchpathedit.test(path)) {
        EditArtical();
    } else if (matchpathregister.test(path)) {
        //
    } else if (matchpathlist.test(path)) {
        getarticallist();
    } else if (matchuserpath.test(path)) {
        autogetartical();
    } else if (matchpath.test(path)) {
        autogetartical();
    } else {
        autoloadartical();
    }
    return 0;
}
//自动加载文章
function autoloadartical() {
    var essay = unescape(getCookie('essay'));
    var title = unescape(getCookie('title'));
    if (essay != 'null' && essay != "") {
        document.getElementById("text-artical").value = essay;
        document.getElementById("showartical").innerHTML = essay;
    }
    if (title != 'null' && title != "") {
        document.getElementById("text-title").value = title;
        document.getElementById("showtitle").innerHTML = title;
    }
}
//获取文章信息
$('#Modal-artical-passwords-submit').click(function() {
    $(this).html("Loading...");
    autogetartical(1);
});
function autogetartical() {
    var passwords = arguments[0] ? arguments[0] : 0;
    var path = window.location.pathname;
    var matchpath2 = /^\/(([\S\s]+?)\/)?(([\S\s]+?)\/)?$/g; //匹配文章
    var a = matchpath2.exec(path);
    a[2] = decodeURI(a[2]);
    a[4] = decodeURI(a[4]);
    $("#title-editer").hide();
    $("#essay-editer").hide();
    document.getElementById("showtitle").innerHTML = "Loading...";
    document.getElementById("showartical").innerHTML = "";
    if (a[2] != "undefined" && a[4] != "undefined") {
        var postdata = {
            "name": a[2],
            "title": a[4],
            "password": sha256($("#Modal-artical-passwords").val()),
        };
    } else if (a[2] != "undefined" && a[4] == "undefined") {
        var postdata = {
            "title": a[2],
            "password": sha256($("#Modal-artical-passwords").val()),
        };
    } else {
        alert("缺少关键信息");
        return 0;
    }
    if (!passwords) {
        delete(postdata["password"]);
    }
    var pas = $("#Modal-artical-passwords").val();
    $.ajax({
        beforeSend: function(request) {
            request.setRequestHeader('X-CSRFToken', csrftoken);
        },
        type: 'POST',
        url: '/getartical/',
        data: postdata,
        dataType: 'json',
        success: function(data) {
            if (data.state == "success") {
                $("#Modal-artical-password").modal("hide");
                $("#text-title").val(data.title);
                $("#text-artical").val(data.essay);
                title = data.title;
                essay = data.essay;
                document.getElementById("showtitle").innerHTML = title;
                document.getElementById("showartical").innerHTML = essay.replace(/\n/g, "<br>");
                document.getElementById("text-pubtime").value = data.pubtime;
                document.getElementById("text-lastesttime").value = data.lastesttime;
                document.getElementById("text-id").value = data.id;
            } else if (data.state == "Need Password") {
                $("#Modal-artical-password").modal("show");
                document.getElementById("showtitle").innerHTML = "NO SUCH ARTICAL";
                document.getElementById("showartical").innerHTML = "";
            } else {
                $("#Modal-artical-password").modal("hide");
                document.getElementById("showtitle").innerHTML = "NO SUCH ARTICAL";
                document.getElementById("showartical").innerHTML = "";
            }
            return (data);
        }
    });
}
function getarticallist() { //获取文章列表
    var path = window.location.pathname;
    var matchpath2 = /^\/l(ist)?\/(([\S\s]+?)\/)?$/g; //匹配文章
    var a = matchpath2.exec(path);
    a[3] = decodeURI(a[3]);
    var name = a[3] + "/";
    var html = document.getElementById("listshower");
    html.innerHTML = "";
    $("#title-editer").hide();
    $("#essay-editer").hide();
    $("#shower").hide();
    if (a[3] == "undefined") {
        postdata = {}
        name = ""
    } else {
        postdata = {
            'name': a[3]
        }
    }
    $.ajax({
        beforeSend: function(request) {
            request.setRequestHeader('X-CSRFToken', csrftoken);
        },
        type: 'POST',
        url: '/getarticallist/',
        data: postdata,
        dataType: 'json',
        success: function(data) {
            if (data.state == "success") {
                list = data.articallist
                var title = "";
                for (i in list) {
                    title = list[i].title;
                    html.innerHTML = html.innerHTML + '<a id="' + title + '" href="/' + name + title + '/" type="button" class="list-group-item">\
                                                            <span class="label label-default">' + list[i].id + '</span><span style="padding-right: 1em;" ></span>' + title + '\
                                                            <button value="' + title + '" type="button" class="close artical-delete" data-dismiss="alert" aria-label="Close"><span class="glyphicon glyphicon-remove"></span></button>\
                                                            <button onclick="window.location.href=' + "'/e/" + name + title + "/'" + '" style="padding-right: 0.5em;" type="button" class="close artical-edit" data-dismiss="alert" aria-label="Edit"><span class="glyphicon glyphicon-edit"></span></button>\
                                                            </a>';
                }
                if (a[3] != getCookie("name")) {
                    $(".artical-delete").hide()
                }
            } else {
                alert(data.state);
            }
            return (data);
        }
    });
}
//获取编辑文章信息 改正则时注意a的位置编号
function EditArtical() {
    var path = window.location.pathname;
    var matchpath2 = /^\/e(dit)?\/(([\S\s]+?)\/)?(([\S\s]+?)\/)?(([\S\s]+?)\/)?$/g; //匹配文章
    var a = matchpath2.exec(path);
    a[3] = decodeURI(a[3]);
    a[5] = decodeURI(a[5]);
    var isname = 0
    if (a[3] != "undefined" && a[5] != "undefined") {
        postdata = {
            "name": a[3],
            "title": a[5],
            "mode": "edit",
        }
        isname = 1
    } else if (a[3] != "undefined" && a[5] == "undefined") {
        postdata = {
            "title": a[3],
            "mode": "edit",
        }
    }
    $.ajax({
        beforeSend: function(request) {
            request.setRequestHeader('X-CSRFToken', csrftoken);
        },
        type: 'POST',
        url: '/getartical/',
        data: postdata,
        dataType: 'json',
        success: function(data) {
            $("#text-title").val(data.title);
            $("#text-artical").val(data.essay);
            title = data.title;
            essay = data.essay;
            document.getElementById("showtitle").innerHTML = title;
            document.getElementById("showartical").innerHTML = essay.replace(/\n/g, "<br>");
            document.getElementById("text-submit").id = "text-edit-submit";
            document.getElementById("text-edit-submit").value = title;
            document.getElementById("text-pubtime").value = data.pubtime;
            document.getElementById("text-lastesttime").value = data.lastesttime;
            document.getElementById("text-id").value = data.id;
            if (a[6] == undefined) {
                document.getElementById("text-edit-submit").path = "/" + a[2] + a[4];
            } else {
                document.getElementById("text-edit-submit").path = "/" + a[2] + a[4] + a[6];
            }
            if (isname) {
                document.getElementById("text-edit-submit").name = a[3];
            }
            return (data);
        }
    });
}
//搜索事件
function SearchArtical() {
    var html = document.getElementById("listshower");
    var keyword = document.getElementById("header-search").value;
    document.getElementById("search-warning").innerHTML = "Loading...";
    $.ajax({
        beforeSend: function(request) {
            request.setRequestHeader('X-CSRFToken', csrftoken);
        },
        type: 'POST',
        url: '/search/',
        data: {
            'keyword': keyword,
            'name': getCookie("name")
        },
        dataType: 'json',
        success: function(data) {
            if (data.state == "success") {
                list = data.articallist
                var title = "";
                if (list.length < 1) {
                    document.getElementById("search-warning").innerHTML = "没有找到";
                } else {
                    history.pushState({},
                    "note", "/search/");
                    html.innerHTML = "";
                    document.getElementById("header-search").value = "";
                    $("#title-editer").hide();
                    $("#essay-editer").hide();
                    $("#shower").hide();
                    for (i in list) {
                        title = list[i].title;
                        html.innerHTML = html.innerHTML + '<a id="' + title + '" href="/' + name + title + '/" type="button" class="list-group-item">\
                                                                <span class="label label-default">' + list[i].id + '</span><span style="padding-right: 1em;" ></span>' + title + '\
                                                                <button value="' + title + '" type="button" class="close artical-delete" data-dismiss="alert" aria-label="Close"><span class="glyphicon glyphicon-remove"></span></button>\
                                                                <button onclick="window.location.href=' + "'/e/" + name + title + "/'" + '" style="padding-right: 0.5em;" type="button" class="close artical-edit" data-dismiss="alert" aria-label="Edit"><span class="glyphicon glyphicon-edit"></span></button>\
                                                                </a>'
                    }
                }
            }
        }
    });
}
//监控回车搜素
$('#header-search').keydown(function(e) {
    if (e.keyCode == 13 && CheckSearchInput()) {
        SearchArtical()
    }
});
//按钮监控
$('#header-search-buttom').click(function() {
    if (CheckSearchInput()) {
        SearchArtical();
    }
});
//检查搜索关键词
$('#header-search').on("focus",function() {
    document.getElementById("search-warning").innerHTML = "";
});
$('#header-search').on("change",function() {
    CheckSearchInput();
});
//检查搜索框
function CheckSearchInput() {
    var word = $('#header-search').val();
    var len = word.replace(/\s/g, "").length;
    if (len < 3) {
        document.getElementById("search-warning").innerHTML = "至少3个字";
        //$("#header-search").attr({"name":"disabled"});
        //$("#header-search-buttom").attr({"disabled":"disabled"});
        return false;
    } else if (word.length >= 40) {
        document.getElementById("search-warning").innerHTML = "至多40个字";
        //$("#header-search").attr({"name":"disabled"});
        //$("#header-search-buttom").attr({"disabled":"disabled"});
        return false;
    } else {
        document.getElementById("search-warning").innerHTML = "";
        //$("#header-search").attr({"name":"true"});
        //$("#header-search-buttom").removeAttr("disabled");
        return true;
    }
}
//过滤关键字
//提交
function setCookie(c_name, value, expiredays) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + expiredays);
    document.cookie = c_name + "=" + escape(value) + ((expiredays == null) ? "": ";expires=" + exdate.toGMTString()); // + ";path=/"
}
function getUTCzone() {
    var d = new Date();
    utc = d.getTimezoneOffset() / 60;
    return utc;
}
//监控文章修改
//$("#text-artical").change(articalshow());
$(document).on('change', '#text-artical',function(){articalshow()});
function articalshow() //过滤文章关键字
{
    var word = document.getElementById("text-artical").value;
    var title = document.getElementById("text-title").value;
    word = word.replace(/<script/g, "").replace(/script>/g, "");
    word = word.replace(/<iframe/g, "").replace(/iframe>/g, "");
    word = word.replace(/<link/g, "");
    word = word.replace(/<style/g, "").replace(/style>/g, "");
    word = word.replace(/<frameset/g, "").replace(/frameset>/g, "");
    document.getElementById("text-artical").value = word;
    document.getElementById("showartical").innerHTML = word.replace("\n","<br>");
    setCookie("essay", escape(word), 30);
    var artical = word;
    if (artical.length > 10 && artical.length < 5000 && title.length > 5 && title.length < 100) {
        $("#text-submit,#text-edit-submit").removeAttr("disabled");
        //$("#text-edit-submit").removeAttr("disabled");
        return true;
    } else {
        $("#text-submit").attr({
            "disabled": "disabled"
        });
        $("#text-edit-submit").attr({
            "disabled": "disabled"
        });
        return false;
    }
}
//监控标题修改
//$("#text-title").change(alert("dfgdfgd"));
$(document).on('change', '#text-title',function(){titleshow()});
function titleshow() //过滤标题关键字
{
    var word = document.getElementById("text-title").value;
    var artical = document.getElementById("text-artical").value;
    word = word.replace(/<|>/g, "");
    word = word.replace(/\s+/g, " ");
    document.getElementById("text-title").value = word;
    document.getElementById("showtitle").innerHTML = word;
    var title = word;
    setCookie("title", escape(word), 30);
    if (artical.length > 10 && artical.length < 5000 && title.length > 5 && title.length < 100) {
        $("#text-submit,#text-edit-submit").removeAttr("disabled");
        //document.getElementById("text-edit-submit").removeAttribute("disabled");
        //$("#text-edit-submit").removeAttr("disabled");
        return true;
    } else {
        $("#text-submit").attr({
            "disabled": "disabled"
        });
        $("#text-edit-submit").attr({
            "disabled": "disabled"
        });
        return false;
    }
}
//监控修改
$(document).on('click', '#text-edit-submit',function(){ //提交文章
    var postdata = {
        "title": $("#text-title").val(),
        "essay": $("#text-artical").val(),
        "password": $("#text-password").val(),
        "tag": $("#text-tag").val(),
        "name": document.getElementById("text-edit-submit").name,
        "rawtitle": document.getElementById("text-edit-submit").value,
    };
    if ($('#text-password').attr("disabled") == "disabled") {
        delete(postdata["password"]);
    }
    if (titleshow() && articalshow()) {
        //alert(titleshow());
        $.ajax({
            beforeSend: function(request) {
                request.setRequestHeader('X-CSRFToken', csrftoken);
            },
            type: 'POST',
            url: '/editartical/',
            data: postdata,
            dataType: 'json',
            success: function(data, status) {
                if (data.state == "success") {
                    setCookie("title", "", 0);
                    setCookie("essay", "", 0);
                    window.location.href = document.getElementById("text-edit-submit").path;
                } else {
                    alert(data.state);
                }
            }
        });
    }
});
//监控删除
$(document).on('click', '.artical-delete',function() {//提交文章
    var title = $(this).val();
    $(this).html('<span id="search-warning" class="label label-warning">Deleteing...</span>');
    $.ajax({
        beforeSend: function(request) {
            request.setRequestHeader('X-CSRFToken', csrftoken);
        },
        type: 'POST',
        url: '/deleteartical/',
        data: {
            "title": title,
            "name": getCookie("name")
        },
        dataType: 'json',
        success: function(data) {
            if (data.state == "success") {
                $(this).html('<span id="search-warning" class="label label-success">success</span>');
                $(("#" + title)).hide();
            } else {
                alert(data.state);
            }
        }
    });
});
//监控提交
$(document).on('click', '#text-submit',function(){ //提交文章
    var postdata = {
        "title": $("#text-title").val(),
        "essay": $("#text-artical").val(),
        "password": $("#text-password").val(),
        "tag": $("#text-tag").val(),
        "name": getCookie("name"),
    };
    if ($('#text-password').attr("disabled") == "disabled") {
        delete(postdata["password"]);
    }
    document.getElementById("text-submit").className = "btn btn-warning";
    document.getElementById("text-submit").innerHTML = "Submiting...";
    var name = getCookie("name");
    if (name == null) {
        name = "";
    } else {
        name = name + "/";
    }
    $.ajax({
        beforeSend: function(request) {
            request.setRequestHeader('X-CSRFToken', csrftoken);
        },
        type: 'POST',
        url: '/submitartical/',
        data: postdata,
        // contentType: "application/json",//该句代码不能加，加了之后无法POST
        dataType: 'json',
        success: function(data, status) {
            if(data.state=="success"){
                setCookie("title", "", 0);
                setCookie("essay", "", 0);
                document.getElementById("text-submit").className = "btn btn-success";
                document.getElementById("text-submit").innerHTML = "success";
                window.location.href = "/" + name + $("#text-title").val() + "/";
            }else{
                document.getElementById("text-submit").className = "btn btn-danger";
                document.getElementById("text-submit").innerHTML = data.state;
            }
        }
    });
});
//监控登录按钮
$("#login-bottom").click(function() {//提交登录
    document.getElementById("login-bottom").className = "btn btn-warning";
    document.getElementById("login-bottom").innerHTML = "Checking...";
    $.ajax({
        beforeSend: function(request) {
            request.setRequestHeader('X-CSRFToken', csrftoken);
        },
        type: 'POST',
        url: '/login/',
        data: {
            "name": $("#login-name").val(),
            "password": sha256($("#login-password").val())
        },
        dataType: 'json',
        success: function(data) { //登陆成功
            if (data.state != "success") {
                document.getElementById("login-bottom").className = "btn btn-danger";
                document.getElementById("login-bottom").innerHTML = data.state;
            } else if (data.state == "success") {
                setCookie("login", 1);
                setCookie("name", data.name);
                document.getElementById("login-bottom").className = "btn btn-success";
                document.getElementById("login-bottom").innerHTML = "Success";
                $("#navbar-userinfo").show();
                document.getElementById("navbar-userinfo").innerHTML = data.name + '<span class="caret"></span>';
                $('#Modal-Login').modal('hide');
                afterlogin(data);
            }
        }
    });
});
//监控详细信息按钮
$(document).on('click', '#text-info-show',
function() //详细信息
{
    $(this).attr('id', 'text-info-hide');
    $("#attributer").show();
});
$(document).on('click', '#text-info-hide',
function() //详细信息
{
    $(this).attr('id', 'text-info-show');
    $("#attributer").hide();
});
$(document).on('click', '#text-shower-show',
function() //展示框
{
    $(this).attr('id', 'text-shower-hide');
    $("#shower").show();
});
$(document).on('click', '#text-shower-hide',
function() //展示框
{
    $(this).attr('id', 'text-shower-show');
    $("#shower").hide();
});
$(document).on('click', '#text-password-on',
function() //启用密码
{
    $(this).html("禁用");
    $(this).attr('id', 'text-password-off');
    $("#text-password").removeAttr('disabled');
});
$(document).on('click', '#text-password-off',
function() //禁用密码
{
    $(this).html("启用");
    $(this).attr('id', 'text-password-on');
    $("#text-password").attr('disabled', 'disabled');
});
//监控打开登录退出页
$(document).on('click', '#open-login',
function() //提交登录
{
    //window.open("/login");
});
$(document).on('click', '#open-logout',
function() //提交登出
{
    $.ajax({
        type: 'GET',
        url: '/logout/',
        data: {
            "name": getCookie("name")
        },
        dataType: 'json',
        success: function(data) {
            if (data.info != "success") {
                //失败？
            } else if (data.info == "success") { //成功退出
                setCookie("login", 1);
                setCookie("name", data.name);
                $("#navbar-userinfo").hide();
                $("#open-login").show();
                setCookie("login", 0, 0);
                setCookie("name", "", 0);
            }
        }
    });
});

//检查注册字符
function CheckRegisterName(name) {
    var matchname = /^[a-zA-Z][0-9a-zA-Z@.\-]{4,29}$/g;
    if (matchname.test(name)) {
        return true;
    }
    return false;
}
function CheckRegisterMail(mail) {
    var matchemail = /^[0-9a-zA-Z][0-9a-zA-Z\-]{0,}@[0-9a-zA-Z\.\-]+?\.[a-zA-Z\.]+[a-zA-Z]$/g;
    if (matchemail.test(mail)) {
        return true;
    }
    return false;
}
function CheckRegisterPassword(passwords) {
    var matchepassword = /^[0-9a-zA-Z@.\-\_\#\$\^\&\*]{6,30}$/g;
    if (matchepassword.test(passwords)) {
        return true;
    }
    return false;
}

//监控提交注册
$(document).on('click', '#register-Signup',
function() //提交注册
{
    var name = $("#register-name").val();
    var mail = $("#register-mail").val();
    var password1 = $("#register-password").val();
    var password2 = $("#register-confirm-password").val();
    var istrue = true;
    if (!CheckRegisterName(name)) {
        document.getElementById("register-name-warning").innerHTML = "用户名有误";
        return false;
    }
    if (!CheckRegisterMail(mail)) {
        document.getElementById("register-mail-warning").innerHTML = "邮箱有误";
        return false;
    }
    if (!CheckRegisterPassword(password1)) {
        document.getElementById("register-password-warning").innerHTML = "密码有误";
        istrue = false;
    }
    if (!CheckRegisterPassword(password2)) {
        document.getElementById("register-confirm-password-warning").innerHTML = "密码有误";
        istrue = false;
    }
    if (password1 != password2) {
        document.getElementById("register-confirm-password-warning").innerHTML = "2次输入密码不同";
        istrue = false;
    }
    if (istrue) {
        document.getElementById("register-Signup").className = "btn btn-warning";
        document.getElementById("register-Signup").innerHTML = "Loading...";
        $.ajax({
            beforeSend: function(request) {
                request.setRequestHeader('X-CSRFToken', csrftoken);
            },
            type: 'POST',
            url: '/register/',
            data: {
                "name": name,
                "mail": mail,
                "password": password1
            },
            dataType: 'json',
            success: function(data) {
                if (data.state == "success") {
                    document.getElementById("register-Signup").className = "btn btn-success";
                    document.getElementById("register-Signup").innerHTML = "success";
                    window.location.href = "/"
                } else {
                    document.getElementById("register-Signup").className = "btn btn-danger";
                    document.getElementById("register-Signup").innerHTML = data.state;
                }
            }
        });
    }
});

//监控注册栏修改
$(document).on('focus', '#register-name', //检查姓名
function() {
    document.getElementById("register-name-warning").innerHTML = "";
});

$(document).on('blur', '#register-name', //检查姓名
function() {
    var name = $("#register-name").val();
    if (!CheckRegisterName(name)) {
        document.getElementById("register-name-warning").innerHTML = "包含非法字符";
    }
    if (name.length < 5) {
        document.getElementById("register-name-warning").innerHTML = "至少5位";
    }
});

$(document).on('focus', '#register-mail', //检查邮箱
function() {
    document.getElementById("register-mail-warning").innerHTML = "";
});

$(document).on('blur', '#register-mail', //检查邮箱
function() {
    var mail = $("#register-mail").val();
    if (!CheckRegisterMail(mail)) {
        document.getElementById("register-mail-warning").innerHTML = "格式错误";
    }
});
$(document).on('focus', '#register-password', //检查密码1
function() {
    document.getElementById("register-password-warning").innerHTML = "";
});

$(document).on('blur', '#register-password', //检查密码1
function() {
    var password1 = $("#register-password").val();
    if (!CheckRegisterPassword(password1)) {
        document.getElementById("register-password-warning").innerHTML = "包含非法字符";
    }
    if (password1.length < 6) {
        document.getElementById("register-password-warning").innerHTML = "至少6位";
    }
});
$(document).on('focus', '#register-confirm-password', //检查密码2
function() {
    document.getElementById("register-confirm-password-warning").innerHTML = "";
});

$(document).on('blur', '#register-confirm-password', //检查密码2
function() {
    var password1 = $("#register-password").val();
    var password2 = $("#register-confirm-password").val();
    if (!CheckRegisterPassword(password2)) {
        document.getElementById("register-confirm-password-warning").innerHTML = "包含非法字符";
    }
    if (password2.length < 6) {
        document.getElementById("register-confirm-password-warning").innerHTML = "至少6位";
    }
    if (password1 != password2) {
        document.getElementById("register-confirm-password-warning").innerHTML = "2次输入密码不同";
    }
});