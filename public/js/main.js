 AOS.init({
 	duration: 800,
 	easing: 'slide'
 });

(function($) {

	"use strict";

	var publicLoaderMarkup = '<div id="ftco-loader" class="show fullscreen"><svg class="circular" width="48px" height="48px"><circle class="path-bg" cx="24" cy="24" r="22" fill="none" stroke-width="4" stroke="#eeeeee"/><circle class="path" cx="24" cy="24" r="22" fill="none" stroke-width="4" stroke-miterlimit="10" stroke="#7367f0"/></svg></div>';

	var ensurePublicLoader = function() {
		if ($('#ftco-loader').length === 0) {
			$('body').append(publicLoaderMarkup);
		}
	};

	var showPublicLoader = function() {
		ensurePublicLoader();
		$('#ftco-loader').addClass('show');
	};

	var shouldShowLoaderForLink = function(link) {
		var $link = $(link);
		var href = $link.attr('href') || '';
		if (!href || href === '#!' || href.charAt(0) === '#') return false;
		if ($link.attr('target') && $link.attr('target') !== '_self') return false;
		if ($link.attr('download') || $link.data('toggle') || $link.data('no-loader')) return false;
		if (/^(javascript:|mailto:|tel:)/i.test(href)) return false;
		try {
			var url = new URL(href, window.location.href);
			return url.origin === window.location.origin && url.href !== window.location.href;
		} catch (error) {
			return false;
		}
	};

	ensurePublicLoader();

	var isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
	var isMobileViewport = function() {
		return window.matchMedia && window.matchMedia('(max-width: 991.98px)').matches;
	};
	var shouldUseParallax = function() {
		return !isTouchDevice && !isMobileViewport();
	};

	if (shouldUseParallax() && $.fn.stellar) {
		$(window).stellar({
			responsive: true,
			parallaxBackgrounds: true,
			parallaxElements: true,
			horizontalScrolling: false,
			hideDistantElements: false,
			scrollProperty: 'scroll',
			horizontalOffset: 0,
			verticalOffset: 0
		});
	} else {
		$('[data-stellar-background-ratio], [data-scrollax]').css('transform', '').removeAttr('data-scrollax');
	}


	var fullHeight = function() {

		$('.js-fullheight').css('height', $(window).height());
		$(window).resize(function(){
			$('.js-fullheight').css('height', $(window).height());
		});

	};
	fullHeight();

	// loader
	var loader = function() {
		setTimeout(function() { 
			if($('#ftco-loader').length > 0) {
				$('#ftco-loader').removeClass('show');
			}
		}, 1);
	};
	loader();

	$(document).on('click', 'a[href]', function() {
		if (shouldShowLoaderForLink(this)) showPublicLoader();
	});

	$(document).on('submit', 'form', function() {
		var target = $(this).attr('target');
		if (!target || target === '_self') showPublicLoader();
	});

	// Scrollax
	if (shouldUseParallax() && $.Scrollax) {
		$.Scrollax();
	}

	var carousel = function() {
		$('.home-slider').owlCarousel({
	    loop:true,
	    autoplay: true,
	    margin:0,
	    animateOut: 'fadeOut',
	    animateIn: 'fadeIn',
	    nav:false,
	    autoplayHoverPause: false,
	    items: 1,
	    navText : ["<span class='ion-md-arrow-back'></span>","<span class='ion-chevron-right'></span>"],
	    responsive:{
	      0:{
	        items:1,
	        nav:false
	      },
	      600:{
	        items:1,
	        nav:false
	      },
	      1000:{
	        items:1,
	        nav:false
	      }
	    }
		});
		$('.carousel-testimony').owlCarousel({
			center: true,
			loop: true,
			items:1,
			margin: 30,
			stagePadding: 0,
			nav: true,
			navText: ['<span class="ion-ios-arrow-back">', '<span class="ion-ios-arrow-forward">'],
			responsive:{
				0:{
					items: 1
				},
				600:{
					items: 1
				},
				1000:{
					items: 1
				}
			}
		});

	};
	carousel();

	$('nav .dropdown').hover(function(){
		var $this = $(this);
		// 	 timer;
		// clearTimeout(timer);
		$this.addClass('show');
		$this.find('> a').attr('aria-expanded', true);
		// $this.find('.dropdown-menu').addClass('animated-fast fadeInUp show');
		$this.find('.dropdown-menu').addClass('show');
	}, function(){
		var $this = $(this);
			// timer;
		// timer = setTimeout(function(){
			$this.removeClass('show');
			$this.find('> a').attr('aria-expanded', false);
			// $this.find('.dropdown-menu').removeClass('animated-fast fadeInUp show');
			$this.find('.dropdown-menu').removeClass('show');
		// }, 100);
	});


	$('#dropdown04').on('show.bs.dropdown', function () {
	  console.log('show');
	});

	// scroll
	var scrollWindow = function() {
		$(window).scroll(function(){
			var $w = $(this),
					st = $w.scrollTop(),
					navbar = $('.ftco_navbar'),
					sd = $('.js-scroll-wrap');

			if (st > 150) {
				if ( !navbar.hasClass('scrolled') ) {
					navbar.addClass('scrolled');	
				}
			} 
			if (st < 150) {
				if ( navbar.hasClass('scrolled') ) {
					navbar.removeClass('scrolled sleep');
				}
			} 
			if ( st > 350 ) {
				if ( !navbar.hasClass('awake') ) {
					navbar.addClass('awake');	
				}
				
				if(sd.length > 0) {
					sd.addClass('sleep');
				}
			}
			if ( st < 350 ) {
				if ( navbar.hasClass('awake') ) {
					navbar.removeClass('awake');
					navbar.addClass('sleep');
				}
				if(sd.length > 0) {
					sd.removeClass('sleep');
				}
			}
		});
	};
	scrollWindow();

	
	var counter = function() {
		
		$('#section-counter').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('ftco-animated') ) {

				var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(',')
				$('.number').each(function(){
					var $this = $(this),
						num = $this.data('number');
						console.log(num);
					$this.animateNumber(
					  {
					    number: num,
					    numberStep: comma_separator_number_step
					  }, 7000
					);
				});
				
			}

		} , { offset: '95%' } );

	}
	counter();

	var contentWayPoint = function() {
		var i = 0;
		$('.ftco-animate').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('ftco-animated') ) {
				
				i++;

				$(this.element).addClass('item-animate');
				setTimeout(function(){

					$('body .ftco-animate.item-animate').each(function(k){
						var el = $(this);
						setTimeout( function () {
							var effect = el.data('animate-effect');
							if ( effect === 'fadeIn') {
								el.addClass('fadeIn ftco-animated');
							} else if ( effect === 'fadeInLeft') {
								el.addClass('fadeInLeft ftco-animated');
							} else if ( effect === 'fadeInRight') {
								el.addClass('fadeInRight ftco-animated');
							} else {
								el.addClass('fadeInUp ftco-animated');
							}
							el.removeClass('item-animate');
						},  k * 50, 'easeInOutExpo' );
					});
					
				}, 100);
				
			}

		} , { offset: '95%' } );
	};
	contentWayPoint();


	// navigation
	var OnePageNav = function() {
		$(".smoothscroll[href^='#'], #ftco-nav ul li a[href^='#']").on('click', function(e) {
		 	e.preventDefault();

		 	var hash = this.hash,
		 			navToggler = $('.navbar-toggler');
		 	$('html, body').animate({
		    scrollTop: $(hash).offset().top
		  }, 700, 'easeInOutExpo', function(){
		    window.location.hash = hash;
		  });


		  if ( navToggler.is(':visible') ) {
		  	navToggler.click();
		  }
		});
		$('body').on('activate.bs.scrollspy', function () {
		  console.log('nice');
		})
	};
	OnePageNav();

	var publicMenuFallback = function() {
		$('.navbar-toggler[data-target]').on('click', function() {
			if ($.fn.collapse) return;
			var target = $(this).attr('data-target');
			var $target = $(target);
			if (!$target.length) return;
			var isOpen = $target.hasClass('show');
			$target.toggleClass('show', !isOpen);
			$(this).attr('aria-expanded', String(!isOpen));
		});
		$('#ftco-nav .nav-link').on('click', function() {
			if ($('.navbar-toggler').is(':visible') && $('#ftco-nav').hasClass('show')) {
				$('#ftco-nav').removeClass('show');
				$('.navbar-toggler').attr('aria-expanded', 'false');
			}
		});
	};
	publicMenuFallback();


	// magnific popup
	$('.image-popup').magnificPopup({
    type: 'image',
    closeOnContentClick: true,
    closeBtnInside: false,
    fixedContentPos: true,
    mainClass: 'mfp-no-margins mfp-with-zoom', // class to remove default margin from left and right side
     gallery: {
      enabled: true,
      navigateByImgClick: true,
      preload: [0,1] // Will preload 0 - before current, and 1 after the current image
    },
    image: {
      verticalFit: true
    },
    zoom: {
      enabled: true,
      duration: 300 // don't foget to change the duration also in CSS
    }
  });

  $('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
    disableOn: 700,
    type: 'iframe',
    mainClass: 'mfp-fade',
    removalDelay: 160,
    preloader: false,

    fixedContentPos: false
  });

  $('.appointment_date').datepicker({
	  'format': 'm/d/yyyy',
	  'autoclose': true
	});
	$('.appointment_time').timepicker();


	$(document).ready(function() {
		// Función para cargar la lista de usuarios
		function loadUsers() {
			$.get('/usuario', function(data) {
				let userList = '';
				data.forEach(function(user) {
					userList += `
						<tr>
							<td>${user.usuario}</td>
							<td>${user.rol}</td>
							<td>
								<button class="btn btn-info btn-sm edit-user" data-id="${user.idUsuario}" data-toggle="modal" data-target="#editUserModal"><i class="fas fa-edit"></i></button>
								<button class="btn btn-danger btn-sm delete-user" data-id="${user.idUsuario}"><i class="fas fa-trash"></i></button>
							</td>
						</tr>`;
				});
				$('#userList').html(userList);
			});
		}
	
		loadUsers(); // Cargar los usuarios al iniciar
	
		// Manejo del formulario de agregar usuario
		$('#addUserForm').on('submit', function(e) {
			e.preventDefault();
	
			const username = $('#username').val();
			const rol = $('#rol').val();
			const password = $('#password').val();
	
			$.post('/usuario/add', { username, rol, password }, function(response) {
				Swal.fire({
					icon: 'success',
					title: 'Éxito',
					text: response.message,
				}).then(() => {
					$('#addUserModal').modal('hide'); // Ocultar el modal
					loadUsers(); // Recargar la lista de usuarios
				});
			}).fail(function(err) {
				Swal.fire({
					icon: 'error',
					title: 'Oops...',
					text: 'Hubo un error al agregar el usuario',
				});
			});
		});
	
		// Abrir el modal de edición con los datos del usuario
		$(document).on('click', '.edit-user', function() {
			const userId = $(this).data('id');
			$.get(`/usuario/${userId}`, function(data) {
				$('#editUsername').val(data.usuario);
				$('#editRol').val(data.rol);
				$('#editUserId').val(data.idUsuario);
			});
		});
	
		// Enviar la solicitud para editar el usuario
		$('#editUserForm').on('submit', function(e) {
			e.preventDefault();
			const userId = $('#editUserId').val();
			const updatedUser = {
				username: $('#editUsername').val(),
				rol: $('#editRol').val(),
			};
	
			$.ajax({
				url: `/usuario/update/${userId}`,
				type: 'PUT',
				data: updatedUser,
				success: function(response) {
					Swal.fire({
						icon: 'success',
						title: 'Éxito',
						text: 'Usuario actualizado correctamente',
					}).then(() => {
						$('#editUserModal').modal('hide');
						loadUsers(); // Recargar la lista de usuarios
					});
				}
			});
		});
	
		// Confirmar y eliminar el usuario
		$(document).on('click', '.delete-user', function() {
			const userId = $(this).data('id');
			Swal.fire({
				title: '¿Estás seguro de eliminarlo?',
				text: "¡No podrás revertir esto!",
				icon: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'Sí, eliminarlo!',
				cancelButtonText: 'Cancelar'
			}).then((result) => {
				if (result.isConfirmed) {
					$.ajax({
						url: `/usuario/delete/${userId}`,
						type: 'DELETE',
						success: function(response) {
							Swal.fire(
								'¡Eliminado!',
								'El usuario ha sido eliminado.',
								'success'
							).then(() => {
								loadUsers(); // Recargar la lista de usuarios
							});
						}
					});
				}
			});
		});
	});
	
	



})(jQuery);
