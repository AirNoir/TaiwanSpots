import json
S="/private/tmp/claude-501/-Users-a01-0220-0077-workspace-my-space-TaiwanSpots/e6056771-8125-42a3-855c-bc262f79d2fa/scratchpad/mk"; R="/Users/a01-0220-0077/workspace/my-space/TaiwanSpots/store/screenshots/zh-Hant"
caps=[("02-home","走到哪，地圖就長到哪","每到一個景點，地圖上就多一座小模型"),
("04-unlock","人到現場，才解鎖得到","用定位打卡，收下那裡的微縮地標"),
("05-passport","130 座地標，慢慢收齊","北中南東，一格一格填滿你的護照"),
("03-spot","每一座，都記得那一天","收藏的日期和當天的天氣，都留在模型上"),
("06-explore","下一站，就在附近","依距離找出還沒去過的景點"),
("07-share","做成收藏卡，分享出去","存進相簿，或傳給一起旅行的人")]
dev={"iphone-6.9":dict(W=1320,H=2868,h1=92,p=44,sw=1056,bz=22,r=150,bottom=80),
     "ipad-13":dict(W=2064,H=2752,h1=116,p=54,sw=1570,bz=30,r=70,bottom=110)}
jobs=[]
for d,c in dev.items():
  for n,(src,t,s) in enumerate(caps,1):
    p=dict(c);W=p.pop('W');H=p.pop('H');p.update(title=t,sub=s,img=f"{R}/{d}/{src}.jpg")
    jobs.append(dict(html=f"{S}/shot.html",W=W,H=H,params=p,out=f"{S}/out/{d}-{n:02d}.jpg"))
json.dump(jobs,open(f"{S}/jobs.json","w"),ensure_ascii=False)
