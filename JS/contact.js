const form=document.getElementById("contactForm");

form.addEventListener("submit",function(e){

e.preventDefault();

form.innerHTML=`

<div class="success">

<div class="success-icon">✔</div>

<h3>Message Sent!</h3>

<p>Thank you for contacting us. We'll get back to you soon.</p>

</div>

`;

});

