
const faqs = [

{
question:"How do I add anime to my favorites?",
answer:"Hover an anime card to use the Favorite button, or open the detail page and tap Add to Favorites."
},

{
question:"Can I watch anime on this platform?",
answer:"AnimeHub helps you discover anime but streaming is provided by partner platforms."
},

{
question:"How do I filter anime by genre?",
answer:"Navigate to the Browse page and use the genre filters to find anime based on your preferences."
},

{
question:"What does each status badge mean?",
answer:"Ongoing: Currently airing. Completed: Finished series. Upcoming: Scheduled to release."
},

{
question:"How can I change my account settings?",
answer:"Click your avatar in the top right and select Settings."
},

{
question:"Is there a mobile app available?",
answer:"Currently AnimeHub works as a responsive web app. A mobile app is coming soon."
},

{
question:"How do recommendations work?",
answer:"Recommendations are based on your favorites, watch history and ratings."
},

{
question:"Can I share my favorites list with friends?",
answer:"Yes. Enable public profile in Settings and share your profile link."
}

];


const container = document.getElementById("faq-container");

function renderFaqs(list){

container.innerHTML="";

list.forEach((faq,index)=>{

const item=document.createElement("div");
item.className="faq-item";

item.innerHTML=`

<div class="faq-question">
${faq.question}
<span>▼</span>
</div>

<div class="faq-answer">
${faq.answer}
</div>

`;

const q=item.querySelector(".faq-question");
const a=item.querySelector(".faq-answer");

q.onclick=()=>{

document.querySelectorAll(".faq-answer").forEach(el=>{
if(el!==a) el.style.display="none";
});

a.style.display=a.style.display==="block"?"none":"block";

};

container.appendChild(item);

});

}

renderFaqs(faqs);


document.getElementById("search").addEventListener("input",function(){

const query=this.value.toLowerCase();

const filtered=faqs.filter(f=>
f.question.toLowerCase().includes(query) ||
f.answer.toLowerCase().includes(query)
);

renderFaqs(filtered);

});

