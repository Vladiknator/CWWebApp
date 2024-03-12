const noteConfig = {
  selector: '.tinymce-body',
  menubar: false,
  inline: true,
  plugins: ['link', 'lists', 'autolink'],
  toolbar: [
    'undo redo | bold italic underline | fontfamily fontsize',
    'forecolor backcolor | alignleft aligncenter alignright alignfull | numlist bullist outdent indent',
  ],
  valid_elements: 'p[style],strong,em,span[style],a[href],ul,ol,li',
  valid_styles: {
    '*': 'font-size,font-family,color,text-decoration,text-align',
  },
};

// eslint-disable-next-line no-undef
tinymce.init(noteConfig);
