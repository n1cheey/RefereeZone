alter table public.tests
  alter column question_bank_size set default 50;

update public.tests
set question_bank_size = 50
where question_bank_size <> 50;

delete from public.test_questions
where order_index > 50;
