#正则替换/s为" "记得做
#所有传入检查name，没有name用公用账户
#传出必有name和username
#以uid作为登录凭证
#文章和标题长度限制
import hashlib
import re
import json
import time
import traceback
#traceback.format_exc()
try:
    import note.sqllib as sqllib
    import note.mail as mail
    from note.config import *
    from note.spider import *
except Exception as e:
    print (traceback.format_exc())
    import sqllib
    import mail
    from config import *
    from spider import *
    
def GetArtical(ActionInfo):#快速获取文章内容，用于主页展示和文章编辑
    ActionInfo["title"] = CleanTitle(ActionInfo["title"])#id title共用关键字
    ActionInfo["id"] = 0
    if ActionInfo["title"].isdigit():
        ActionInfo["id"] = ActionInfo["title"]
    ActionInfo["mode"] = ActionInfo.get("mode",None)
    print ("ActionInfo[name]",ActionInfo)

    if "name" not in ActionInfo:
        ActionInfo["name"]=PUBLICUSER
        ActionInfo["uid"]=PUBLICUSER
    if "author" not in ActionInfo:
        ActionInfo["author"]=PUBLICUSER

    try:
        artical = sqllib.GetArtical(ActionInfo)
    except Exception as e:    
        print(traceback.format_exc())
        return ("Note.GetArtical UnkonwErr")
    if artical is None:
        return {"title":None,"essay":None,"state":"Failed"}

    if artical["saltpassword"] is not None:#如果有密码
        if ActionInfo.get("mode",None)=="edit":#如果有传入密码
            artical["state"]="success"
        elif ActionInfo.get("password",None) is None:#如果没有传入密码
            return {"state":"Need Password","title":"Permission Denied","essay":"Need Password"}
        elif CheckArticalPassword({"saltpassword":artical["saltpassword"],"salt":artical["salt"],"password":ActionInfo.get("password","None")}):#如果有传入密码
            artical["state"]="success"
        else:#传入密码错误
            return {"state":"Failed","title":"Get Title Error","essay":"Get Essay Error"}
    else:
        artical["state"]="success"

    del artical["saltpassword"]
    del artical["salt"]
    del artical["uid"]
    artical["lastesttime"]=artical["lastesttime"].strftime('%Y-%m-%d %H:%M:%S')
    artical["pubtime"]=artical["pubtime"].strftime('%Y-%m-%d %H:%M:%S')
    return artical
    
def CheckUser(uf):#检查用户能否登录
    name = uf["name"].lower()
    password = uf["password"]
    info = {}
    if CheckUserName(name):
        userinfo = sqllib.GetLoginInfo ({'name':name})
        if userinfo is None:
            state = "Failed"
            stateinfo = "ERROR UserName"
            islogin = False
        else:
            shapassword = hashlib.sha256()
            shapassword.update((str(password)+userinfo['salt']).encode('utf-8'))
            t = time.mktime(userinfo["now"].timetuple())-time.mktime(userinfo["lastfailedtime"].timetuple())
            t = (t/3600)
            waitetime=WAITETIME*(WAITENUM**(userinfo["lgnfailedtimes"]-LOGINFAILEDTIMES+1))
            if userinfo["lgnfailedtimes"]>=LOGINFAILEDTIMES and t<waitetime:
                state = "Login Failed Too Many Times Try After %s Hour"%(float('%0.3f'%(waitetime-t)))
                print (state)
                stateinfo = "Login Failed Too Many Times"
                islogin = False
            elif shapassword.hexdigest()==userinfo['saltpassword']:
                sqllib.CleanFailedTimes ({'name':name})
                state = "success"
                stateinfo = "success"
                islogin = True
                info["uid"] = userinfo["uid"]
                info["name"] = userinfo["name"]
                info["permissions"] = userinfo["permissions"]
            else:
                sqllib.LoginFailed ({'name':name})
                state = "Failed"
                stateinfo = "Password Error"
                islogin = False
    else:
        state = "Failed"
        stateinfo = "Check Name Failed"
        islogin = False
    info["state"]=state
    return (islogin,info,stateinfo)

def CheckArticalPassword(ActionInfo):#发现文章有密码之后的操作
    shapassword = hashlib.sha256()
    shapassword.update((str(ActionInfo["password"])+ActionInfo['salt']).encode('utf-8'))
    if shapassword.hexdigest()==ActionInfo['saltpassword']:
        return True
    else:
        return False
        
def SubmitArtical(ActionInfo):
#ActionInfo=('title','name','essay','permission','blgroup','password','prikey','pubkey')
    ActionInfo["title"] = CleanTitle(ActionInfo["title"])
    ActionInfo["essay"] = CleanArtical(ActionInfo["essay"])
    
    if "name" not in ActionInfo:#必须有name字段，登录验证由session处理
        ActionInfo["name"]=PUBLICUSER
        ActionInfo["uid"]=PUBLICUSER
    if "author" not in ActionInfo:#必须有author字段
        ActionInfo["author"]=PUBLICUSER
        
    #检查文章种类
    if ActionInfo["type"] in ARTICALTYPELIST:
        try:
            if CheckTitle(ActionInfo["title"]):
                sqllib.CreatArtical (ActionInfo)
                return({"state":"success"})
            else:
                return({"state":"Title Err"})
        except Exception as e:
            print(traceback.format_exc())
            if ("Duplicate entry" in str(e)):
                return({"state":"标题重复"})
            return("未知错误")
    else:
        return (ARTICLETYPEERR)
        
def EditArtical(ActionInfo):#修改文章
#ActionInfo=('title','name','essay','permission','blgroup','password','prikey','pubkey')
    ActionInfo["rawtitle"] = CleanTitle(ActionInfo["rawtitle"])
    ActionInfo["title"] = CleanTitle(ActionInfo["title"])
    ActionInfo["essay"] = CleanArtical(ActionInfo["essay"])
    
    if "name" not in ActionInfo:#必须有name字段，登录验证由session处理
        ActionInfo["name"]=PUBLICUSER
        ActionInfo["uid"]=PUBLICUSER
    if "author" not in ActionInfo:#必须有author字段
        ActionInfo["author"]=PUBLICUSER
        
    if ActionInfo["type"] in ARTICALTYPELIST:
        if "password" in ActionInfo:
            if ActionInfo["password"]==str(RESETARTCALPASSWORD):#如果取消密码
                print("resetpassword")
                ActionInfo["saltpassword"]=None
                ActionInfo["salt"]=None
                del ActionInfo["password"]
            else:
                ActionInfo = CreateSaltAndPassword(ActionInfo)

        if CheckUserName(ActionInfo["name"]) and CheckTitle(ActionInfo["title"]):
            try:
                if sqllib.EditArtical(ActionInfo) is True:
                    return ({"state":"success"})
            except Exception as e:
                if ("Duplicate entry" in str(e)):
                    return({"state":"标题重复"})
                else:
                    print(traceback.format_exc())
                return("未知错误")
    else:
        return (ARTICLETYPEERR)
        
def DeleteArticalByNameTitle (ActionInfo):
    ActionInfo["title"] = CleanTitle(ActionInfo["title"])
    
    if "author" not in ActionInfo:#必须有author字段
        ActionInfo["author"]=PUBLICUSER
        
    if "uid" in ActionInfo:#必须有uid字段，登录验证由session处理
        ActionInfo["author"] = ActionInfo.get("author",ActionInfo["name"])
        try:
            sqllib.DeleteArticalByNameTitle(ActionInfo)
            return "success"
        except Exception as e:
            print(traceback.format_exc())
            return(str(e))
    return "Failed"
    
def GetArticalList(ActionInfo):

    if "name" not in ActionInfo:#必须有uid字段否则视为未登录，登录验证由session处理
        ActionInfo["name"]=PUBLICUSER
        ActionInfo["uid"]=PUBLICUSER
    if "author" not in ActionInfo:
        ActionInfo["author"]=PUBLICUSER
        
    if ("page" not in ActionInfo) or (int(ActionInfo["page"])<1):
        ActionInfo["page"] = 1
    else:
        ActionInfo["page"] = int(ActionInfo["page"])
    if ("eachpage" not in ActionInfo):
       ActionInfo["eachpage"] = EACHPAGENUM
    if CheckUserName(ActionInfo["name"]):
    #权限不足时如何报错
        try:
            res = sqllib.GetArticalList (ActionInfo)
            count = res["count"]
            result = res["result"]
        except Exception as e:
            print(traceback.format_exc())
            return("GetArticalList未知错误",0,False)
        for artical in result:
            artical["lastesttime"]=artical["lastesttime"].strftime('%Y-%m-%d %H:%M:%S')
            artical["pubtime"]=artical["pubtime"].strftime('%Y-%m-%d %H:%M:%S')
            if artical["saltpassword"]==None:
                artical["password"]=0
            else:
                artical["password"]=1
            del artical["saltpassword"]
        return(result,count,True)
    else:
        return("Name Err",0,False)

def SpiderResponser(url):
    s = r'^\/(([\S\s]+?)\/)?(([\S\s]+?)\/)?$'
    try:
        a = re.match(s, url).groups()#1,3
    except:
        print(traceback.format_exc())
    #print (a[0],a[1],a[2],a[3])
    if (a[1] != "list"):
        return GetSpiderArticle(a[1],a[3])
    elif (a[1] == "list"):
        pass
        
def GetSpiderArticle(user,title):
    if title is None:
        title = user
        user = PUBLICUSER
    af = {
        "mode":"GetArticle",
        "title":title,
        "name":user,
        "iflogin":False
    }
    res = GetArtical(af)
    #res["essay"] = res["essay"].replace("\n","<br>")
    #res["essay"] = re.sub(r'\s','&nbsp;', res["essay"])
    return APIDERARTICLE.format(res["title"],res["essay"])
    
#保密性需求，是否要开放列表？
def GetSpiderArticleList(list,user):
    if user is None:
        user = PUBLICUSER
    af = {
        "mode":"GetArticleList",
        "name":user,
        "iflogin":False
    }
    res = GetArticalList(af)
    return 0
    
def SearchArticalList(ActionInfo):
    if "name" not in ActionInfo:#必须有name字段否则视为未登录，登录验证由session处理
        ActionInfo["name"]=PUBLICUSER
        ActionInfo["uid"]=PUBLICUSER
    ActionInfo["keyword"] = ActionInfo["keyword"].strip()
    if CheckUserName(ActionInfo["name"]) and CheckKeyWord(ActionInfo["keyword"]):
        try:
            result = sqllib.SearchArtical (ActionInfo)
            for artical in result:
                artical["lastesttime"]=artical["lastesttime"].strftime('%Y-%m-%d %H:%M:%S')
                artical["pubtime"]=artical["pubtime"].strftime('%Y-%m-%d %H:%M:%S')
                if artical["name"]==PUBLICUSER:
                    del artical["name"]
            return(result,True)
        except Exception as e:
            print(traceback.format_exc())
            return("SearchArticalList未知错误",False)
    else:
        return({"state":"Failed"},False)
        
def CreateUser(uf):#生成用户，生成uid，生成盐
    import uuid
    #uf should have ('uid','name','mail','salt','saltpassword')
    uf["name"] = uf["name"].lower()
    uf["mail"] = uf["mail"].lower()
    if CheckUserName(uf['name']) and CheckUserPassword(uf['password']) and CheckUserMail(uf['mail']):
        t = str(int(time.time()))
        #生成salt
        salt = hashlib.sha256()
        salt.update((uf['password'][0:5]+t+uf['name'][0:4]).encode('utf-8'))
        uf["salt"] = salt.hexdigest()
        #生成hash256password
        hash256password = hashlib.sha256()
        hash256password.update((uf['password']).encode('utf-8'))
        uf['hash256password'] = hash256password.hexdigest()
        #生成saltpassword
        saltpassword = hashlib.sha256()
        saltpassword.update((uf['hash256password']+uf["salt"]).encode('utf-8'))
        uf['saltpassword'] = saltpassword.hexdigest()
        #生成uid
        uf['uid'] = str(uuid.uuid3(uuid.uuid1(), uf['mail']))
        try:
            info = sqllib.CreateUser(uf)
            mail.Send(uf["mail"],MAIL_TITLE_SIGNIN,MAIL_ARTICAL_SIGNIN)
            return ("success",info)
        except Exception as e:
            err = str(e)
            if "Duplicate entry" in err:
                if "name" in err:
                    return ("Name Already Exist",False)
                elif "mail" in err:
                    return ("Mail Already Exist",False)
                else:
                    print(err)
                    return (err,False)
            else:
                print(traceback.format_exc())
                return (e,False)
    else:
        return ("Name Or Password Err",False)

def ChangeUserPassword(uf):#更改密码，要求登录
    #uf should have name password newpassword
    uf["name"] = uf["name"].lower()
    (Islogin,userinfo,state) = CheckUser(uf)
    if Islogin:
        info = sqllib.GetUserInfo (uf)
        info["password"] = uf["newpassword"]
        info = CreateSaltAndPassword(info)
        sqllib.ResetPassword (info)
        mail.Send(info["mail"],MAIL_TITLE_CGPASSWORD,MAIL_ARTICAL_CGPASSWORD)
        return (True,"success")
    else:
        print("ChangeUserPassword",Islogin,userinfo,state)
        return (False,"Name Or Password err")
      
def ReCreateUserPassword(uf):#重置密码用户名
    import uuid
    #uf should have ('uid','name','mail','salt','saltpassword')
    uf["name"] = uf["name"].lower()
    uf["mail"] = uf["mail"].lower()
    #print("ReCreateUserPassword",uf)
    if CheckUserName(uf["name"]) and CheckUserMail(uf["mail"]):
        info = sqllib.GetUserInfo (uf)
        if uf["mail"] == info["mail"]:
            newpassword = str(uuid.uuid3(uuid.uuid1(), uf['mail']))
            info["password"] = newpassword
            info = CreateSaltAndPassword(info)
            sqllib.ResetPassword (info)#重置密码
            mail.Send(uf["mail"],MAIL_TITLE_RSPASSWORD,MAIL_ARTICAL_RSPASSWORD%(newpassword))
            sqllib.CleanFailedTimes (info)#清空登录计数
            return (True,"success")
        else:
            return (False,"Mail Not Match")
    else:
        return (False,"Name wrong")
        
def CheckUserName(Name):#检查用户名是否合法
    s = r'^[a-zA-Z][0-9a-zA-Z@.\-]{4,29}$'
    if re.match(s, Name):
        return True
    else:
        return False

def CheckUserPassword (Password):#检查密码是否合法
    s = r'^[0-9a-zA-Z@.\-\_\#\$\^\&\*]{6,128}$'
    if re.match(s, Password):
        return True
    else:
        return False   

def CheckUserMail(Mail):#检查邮箱是否合法
    s = r'^[0-9a-zA-Z][0-9a-zA-Z\-]{0,}@[0-9a-zA-Z.\-]+?.[a-zA-Z.]+[a-zA-Z]$'
    if re.match(s, Mail):
        return True
    else:
        return False

def CleanTitle(Title):
    Title = re.sub(r'\s',' ', Title)
    Title.replace("<","").replace(">","")
    return Title
    

def CheckTitle(Title):
    s = r'[\\#\$\?<>]'
    if re.match(s, Title):
        return False
    else:
        return True
        
def CheckKeyWord(KeyWord):
    s = r'[`=\/]'
    print(KeyWord.replace(" ",""))
    if re.match(s, KeyWord) or len(KeyWord.replace(" ",""))<MINSEARCHLENGTH or len(KeyWord.replace(" ",""))>MAXSEARCHLENGTH:
        return False
    else:
        return True  
def CleanArtical(Artical):
    Artical.replace("<script","").replace("script>","")
    Artical.replace("<iframe","").replace("iframe>","")
    Artical.replace("<link","")
    Artical.replace("<style","").replace("style>","")
    Artical.replace("<frameset","").replace("frameset>","")
    return Artical

def SendMail(mail):
    pass
    return True

def CreateSaltAndPassword(af):#重新生成salt和密码
    #password uid/name
    t = str(int(time.time()))
    #生成salt
    salt = hashlib.sha256()
    salt.update((af['password'][0:5]+t+af.get('uid',af["name"])[0:4]).encode('utf-8'))
    af["salt"] = salt.hexdigest()
    #生成hash256password
    hash256password = hashlib.sha256()
    hash256password.update((af['password']).encode('utf-8'))
    af['hash256password'] = hash256password.hexdigest()
    #生成saltpassword
    saltpassword = hashlib.sha256()
    saltpassword.update((af['hash256password']+af["salt"]).encode('utf-8'))
    af['saltpassword'] = saltpassword.hexdigest()
    return af