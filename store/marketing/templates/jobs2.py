import json
S="/private/tmp/claude-501/-Users-a01-0220-0077-workspace-my-space-TaiwanSpots/e6056771-8125-42a3-855c-bc262f79d2fa/scratchpad/mk"; R="/Users/a01-0220-0077/workspace/my-space/TaiwanSpots/store/screenshots/zh-Hant"; A="/Users/a01-0220-0077/workspace/my-space/TaiwanSpots/assets/spots"
CL=[[-.1,.08,.45,.12],[.62,.03,.5,.1],[.7,.42,.4,.1],[-.15,.6,.4,.1]]
shots=[
 ("02-home","走到哪，地圖就長到哪","每到一個景點，地圖就多一座小模型",("#BFE0F2","#E4F0F4","#F6F1E7"),"#2B6A8E",
   [dict(id="jiufen",x=.70,y=.115,w=.33,rot=4),dict(id="taipei-101",x=-.05,y=.58,w=.24,rot=-3)],[]),
 ("04-unlock","人到現場，才解鎖得到","用定位打卡，收下那裡的微縮地標",("#FBD99A","#FBEBCB","#F6F1E7"),"#9A5A0E",
   [],[[.05,.19,.09],[.85,.22,.07],[.04,.52,.06],[.86,.6,.09],[.47,.155,.045],[.9,.4,.04]]),
 ("05-passport","130 座地標，慢慢收齊","北中南東，一格一格填滿護照",("#C9E8D2","#E6F2E6","#F6F1E7"),"#2E7A4E",
   [dict(id="sun-moon-lake",x=.66,y=.12,w=.36,rot=3),dict(id="kenting",x=-.08,y=.66,w=.3,rot=-4)],[]),
 ("03-spot","每一座，都記得那一天","收藏的日期和天氣，都留在模型上",("#F8D3C0","#FAE6DA","#F6F1E7"),"#A2482A",
   [dict(id="alishan",x=-.07,y=.12,w=.33,rot=-4)],[]),
 ("06-explore","下一站，就在附近","依距離找出還沒去過的景點",("#C6DDF2","#E2ECF5","#F6F1E7"),"#2F5C8C",
   [dict(id="yehliu",x=.74,y=.12,w=.26,rot=5),dict(id="sanxiantai",x=-.1,y=.70,w=.34,rot=-3)],[]),
 ("07-share","做成收藏卡，分享出去","存進相簿，或傳給一起旅行的人",("#DCD2F0","#ECE6F4","#F6F1E7"),"#5B4A8E",
   [dict(id="rainbow-village",x=.68,y=.115,w=.33,rot=4)],[]),
]
dev={"iphone-6.9":dict(W=1320,H=2868,h1=92,p=40,sw=1010,bz=22,r=145,bottom=60),
     "ipad-13":dict(W=2064,H=2752,h1=116,p=50,sw=1520,bz=30,r=70,bottom=90)}
jobs=[]
for d,c in dev.items():
  for n,(src,t,s,cs,ink,deco,sp) in enumerate(shots,1):
    p=dict(c);W=p.pop('W');H=p.pop('H')
    k=.62 if d=="ipad-13" else .9
    deco=[dict(x,w=x['w']*k,x=((1-x['w']*k-.015) if x['x']>.5 else .015)) for x in deco]
    p.update(title=t,sub=s,img=f"{R}/{d}/{src}.jpg",c1=cs[0],c2=cs[1],c3=cs[2],ink=ink,deco=deco,sparks=sp,clouds=CL,A=A)
    jobs.append(dict(html=f"{S}/shot2.html",W=W,H=H,params=p,out=f"{S}/out2/{d}-{n:02d}.png"))
json.dump(jobs,open(f"{S}/jobs2.json","w"),ensure_ascii=False)
